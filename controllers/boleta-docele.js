const { response, request } = require("express");
const soap = require("soap");
const parseString = require('xml2js').parseString;
const fs = require('fs');
const xml2js = require('xml2js');

const postBoletaDocele = (req, res = response) => {
  try {
    const { productos, total, iva, neto, totalFlete, fecha, vendedor, cliente, pagos } = req.body;
    //SE CREA CONNECCION SOAP
    // console.log(req.body);

    soap.createClientAsync(`${process.env.URLDEVDOCELE}`)
      .then((client) => {

        // client.addHttpHeader('facele.user', 'd5885a2db')
        // client.addHttpHeader('facele.pass', 'JcbZmmyZW6AAJsL3CdhD/w==')

        //TOTAL DESCUENTOS. POR RAZONES COMERCIALES SE ESTABLECIO QUE EN LA BOLETA EL DESCUENTO SERIA GLOBAL
        const totalDescuentoPesosNeto = productos.reduce((acum, producto) => acum + (Math.round(producto.descuento_pesos / 1.19) * producto.cantidad), 0);
        //CONSTRUIR DETALLE PRODUCTOS
        let detalleProductos = "";
        productos.forEach((producto, key) => {
          const netoProd = Math.round(producto.precio_unitario / 1.19);
          // console.log(netoProd);
          detalleProductos += `  
      <Detalle>
      <NroLinDet>${key + 1}</NroLinDet>
      <CdgItem>
      <TpoCodigo></TpoCodigo>
      <VlrCodigo>${producto.ean13}</VlrCodigo>
      </CdgItem>
      <NmbItem>${producto.descripcion}</NmbItem>
      <QtyItem>${producto.cantidad}</QtyItem>
      <PrcItem>${netoProd}</PrcItem>
      <MontoItem>${netoProd * producto.cantidad}</MontoItem>
      </Detalle>`;
        });
        //SI HAY FLETE AGREGAR AL DETALLE

        const netoFlete = Math.round(totalFlete / 1.19);

        totalFlete > 0
          ? (detalleProductos += `
    <Detalle>
    <NroLinDet>${productos.length + 1}</NroLinDet>
    <NmbItem>Servicio de despacho </NmbItem>
    <PrcItem>${netoFlete}</PrcItem>
    <MontoItem>${netoFlete}</MontoItem>
    </Detalle>`)
          : null;

        //ARMAR PAGOS
        let pagosXML = ""
        let montoCash = 0, montoDebit = 0, montoCredit = 0

        pagos.forEach(pago => {
          // console.log(pago)
          if (pago.tipo == "Efectivo") {
            montoCash += pago.monto
          } else if (pago.tipo == "Debito") {
            montoDebit += pago.monto
          } else if (pago.tipo == "Credito") {
            montoCredit += pago.monto
          }
          pagosXML += `${pago.tipo} /`
        });

        // console.log("Formas de Pago: ")
        // console.log("Efectivo: ", montoCash)
        // console.log("Debito: ", montoDebit)
        // console.log("Credito", montoCredit)

        const xml = `
      <DTE version="1.0">
      <Documento>
      <Encabezado>
        <IdDoc>
          <TipoDTE>39</TipoDTE>
          <Folio>0</Folio>
          <FchEmis>${fecha}</FchEmis>
          <IndServicio>3</IndServicio>
          <IndMntNeto>2</IndMntNeto>
        </IdDoc>
        <Emisor>
          <RUTEmisor>96666610-2</RUTEmisor>
          <RznSocEmisor>VILU S.A.</RznSocEmisor>
          <GiroEmisor>GRANDES TIENDAS, PERFUMERIAS, VESTUARIO, ACCESORIOS</GiroEmisor>
          <CdgSIISucur>088016549</CdgSIISucur>
          <DirOrigen>MANQUEHUE #2056,SANTIAGO</DirOrigen> 
          <CmnaOrigen>VITACURA</CmnaOrigen>
          <CiudadOrigen>SANTIAGO</CiudadOrigen>
        </Emisor>
        <Receptor>
          <RUTRecep>${cliente.rut == '1-9' ? '66666666-6' : cliente.rut}</RUTRecep>
          <RznSocRecep>${cliente.rut == '1-9' ? 'GENERICO' : (`${cliente.nombres} ${cliente.apellidos}`)}</RznSocRecep>
          <CmnaRecep>${cliente.rut == '1-9' ? '' : cliente.comuna}</CmnaRecep>
          <CiudadRecep></CiudadRecep>
        </Receptor>
        <Totales>
          <MntNeto>${neto}</MntNeto>
          <IVA>${iva}</IVA>
          <MntTotal>${total}</MntTotal>
        </Totales>
      </Encabezado>
    ${detalleProductos}
    ${totalDescuentoPesosNeto ? `
    <DscRcgGlobal>
      <NroLinDR>1</NroLinDR>
      <TpoMov>D</TpoMov>
      <GlosaDR>Descuento</GlosaDR>
      <TpoValor>$</TpoValor>
      <ValorDR>${totalDescuentoPesosNeto}</ValorDR>
    </DscRcgGlobal>`: ''}
      </Documento>
      <Adicional>
        <WhsCode></WhsCode>
        <WhsName>Manquehue</WhsName>
        <Direccion>MANQUEHUE #2056,SANTIAGO</Direccion>
        <Comuna>VITACURA</Comuna>
        <Ciudad>SANTIAGO</Ciudad>
        <Vendedor>${vendedor}</Vendedor>
        <FormaPago>
          <Efectivo>${montoCash}</Efectivo>
          <Debito>${montoDebit}</Debito>
          <Credito>${montoCredit}</Credito>
        </FormaPago>
        <Comment>${pagosXML}</Comment>
      </Adicional>

      </DTE>`;
        // console.log(xml)


        //argumentos LoginToken
        const argsToken = {
          User: "admin",
          Pass: "123456",
        }

        client.LoginDTE(argsToken, function (err, result) {

          if (err) {
            return res.status(500).send({ message: `Error al realizar el login de DTE: ${err}` })
          } else {
            
            parseString(result.LoginDTEResult, function (err, resultado) {
              if (err) {
                console.error(err);
                res.status(400).json({ msg: err.message });
              } else {
                // console.log("resultadoLogin: ", resultado.Return.Data[0].Token[0]);
                let token = resultado.Return.Data[0].Token[0];
                //argumentos de la consulta
                const args = {
                  Token: token,
                  TipoDE: "39",
                  Folio: "0",
                  DocXml: xml,
                };


                client.FirmarDTE(args, function (err, result) {

                  if (err) {
                    console.error(err);
                    res.status(400).json({ msg: err.message });
                  } else {
                    let match = result.FirmarDTEResult.match(/<Ted>([\s\S]*?)<\/Ted>/);
                    let Firma = match ? match[1] : null;
                    parseString(result.FirmarDTEResult, function (err, resultado) {
                      if (err) {
                        console.error(err);
                        res.status(400).json({ msg: err.message });
                      } else {
                        // console.log("resultado: ", resultado.Return.Data[0].Ted[0]);
                        // let Firma = resultado.Return.Data[0].Ted[0];
                        let estadoOperacion = resultado.Return.Code[0];
                        let descripcionOperacion = resultado.Return.Msg[0];
                        let FolioDte = resultado.Return.Data[0].Folio[0];


                        let response = {
                          'Firma': Firma,
                          'estadoOperacion': parseInt(estadoOperacion),
                          'descripcionOperacion': descripcionOperacion,
                          'folioDte': parseInt(FolioDte),
                        };

                        // console.log(response);
                        res.status(200).json(response);
                      }
                    });
                  }
                });
              }
            })
          }
        })


      })
      .catch((error) => {
        console.error(error);
        res.status(400).json({ msg: error.message });
      });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ msg: error.message });
  }
};

const getBoletaDocele = (req, res = response) => {
  const { folio } = req.params;
  soap.createClientAsync(`${process.env.URLDEVDOCELE}`)
    .then((client) => {

      const argsToken = {
        User: "admin",
        Pass: "123456",
      }

      client.LoginDTE(argsToken, function (err, result) {

        if (err) {
          return res.status(500).send({ message: `Error al realizar el login de DTE: ${err}` })
        } else {
          parseString(result.LoginDTEResult, function (err, resultado) {
            if (err) {
              console.error(err);
              res.status(400).json({ msg: err.message });
            } else {
              // console.log("resultadoLogin: ", resultado.Return.Data[0].Token[0]);
              let token = resultado.Return.Data[0].Token[0];
              //argumentos de la consulta
              const args = {
                Token: token,
                TipoDE: "39",
                Folio: folio.toString(),
              };
              client.ObtenerTED(args, function (err, result) {
                // console.log("Result: ", result)
                if (err) {
                  console.error(err);
                  res.status(400).json({ msg: err.message });
                } else {
                    let match = result.ObtenerTEDResult.match(/<Ted>([\s\S]*?)<\/Ted>/);
                    let Firma = match ? match[1] : null;
                    parseString(result.ObtenerTEDResult, function (err, resultado) {
                    if (err) {
                      console.error(err);
                      res.status(400).json({ msg: err.message });
                    } else {


                      let response = {
                        'TipoDE': '39',
                        'folioDte': parseInt(folio),
                        'Firma': Firma,
                      };

                      // console.log(response);
                      res.status(200).json(response);
                    }
                  });
                }
              });
            }
          })
        }
      }

      )
    })
    .catch((error) => {
      console.error(error);
      res.status(400).json({ msg: error.message });
    });
};

module.exports = {
  postBoletaDocele,
  getBoletaDocele,
};
