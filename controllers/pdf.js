const { response, request } = require("express");
const soap = require("soap");
const parseString = require('xml2js').parseString;
const fs = require('fs');

const postPDF = (req, res = response) => {
  try {
    const { productos, total, iva, neto, totalFlete, fecha, vendedor, cliente, pagos, FolioDTE, Firma } = req.body;
    //SE CREA CONNECCION SOAP
    

    soap.createClientAsync(`${process.env.URLDEVDOCELE}`)
      .then((client) => {


        //TOTAL DESCUENTOS. POR RAZONES COMERCIALES SE ESTABLECIO QUE EN LA BOLETA EL DESCUENTO SERIA GLOBAL
        const totalDescuentoPesosNeto = productos.reduce((acum, producto) => acum + (Math.round(producto.descuento_pesos / 1.19) * producto.cantidad), 0);
        //CONSTRUIR DETALLE PRODUCTOS
        let detalleProductos = "";
        productos.forEach((producto, key) => {
          const netoProd = Math.round(producto.precio_unitario / 1.19);
          // console.log("producto.ean13: ", producto.ean13);
          detalleProductos += `<Doc>
      <TipoDTE>39</TipoDTE>
      <Folio>${FolioDTE}</Folio>
      <FchEmis>${fecha}</FchEmis>
      <IndServicio>3</IndServicio>
      <RUTEmisor>96666610-2</RUTEmisor>  
      <RznSoc>VILU S.A.</RznSoc>
      <GiroEmis>ARRIENDO Y ADM DE BB INMUEBLES, PERFUMERIA,ESTACIONAMIENTO VEHICULO</GiroEmis>  
      <DirOrigen>MANQUEHUE #2056,SANTIAGO</DirOrigen>  
      <CmnaOrigen>VITACURA</CmnaOrigen>
      <CiudadOrigen>SANTIAGO</CiudadOrigen>
      <RUTRecep>${cliente.rut == '1-9' ? '66666666-6' : cliente.rut}</RUTRecep>
      <RznSocRecep>${cliente.rut == '1-9' ? 'GENERICO' : (`${cliente.nombres} ${cliente.apellidos}`)}</RznSocRecep>
      <GiroRecep>particular</GiroRecep>
      <DirRecep></DirRecep>
      <CmnaRecep>${cliente.rut == '1-9' ? '' : cliente.comuna}</CmnaRecep>
      <CiudadRecep></CiudadRecep>
      <MntBruto></MntBruto>
      <Descuento>${totalDescuentoPesosNeto}</Descuento>
      <Recargo></Recargo>
      <MntNeto>${neto}</MntNeto>
      <MntExe></MntExe>
      <IVA>${iva}</IVA>
      <MntTotal>${total}</MntTotal>
      <QtyTotal></QtyTotal>
      <Comment>comentario 1</Comment>
      <Vendedor>${vendedor}</Vendedor>
      <Sucursal>Tienda 1</Sucursal>
      <NroLinDet>${key + 1}</NroLinDet>
      <TpoCodigo>ALU</TpoCodigo>
      <VlrCodigo>${producto.ean13}</VlrCodigo>
      <NmbItem>${producto.descripcion}</NmbItem>
      <DscItem>${producto.descripcion}</DscItem>
      <QtyItem>${producto.cantidad}</QtyItem>
      <PrcItem>${producto.precio_unitario_iva_incl}</PrcItem>
      <DescuentoItem>${producto.descuento_unitario_pesos}</DescuentoItem>
      <MontoItem>${producto.precio_final_iva_incl * producto.cantidad}</MontoItem>
      </Doc>`;
    });
    // <NroLinDet>${key + 1}</NroLinDet>
    // <CdgItem>
    // <TpoCodigo></TpoCodigo>
    // <VlrCodigo>${producto.ean13}</VlrCodigo>
    // </CdgItem>
    // <NmbItem>${producto.descripcion}</NmbItem>
    // <QtyItem>${producto.cantidad}</QtyItem>
    // <PrcItem>${netoProd}</PrcItem>
    // <MontoItem>${netoProd * producto.cantidad}</MontoItem>
    
    //SI HAY FLETE AGREGAR AL DETALLE
    
        const netoFlete = Math.round(totalFlete / 1.19);

        totalFlete > 0
          ? (detalleProductos += `<Doc>
    <NroLinDet>${productos.length + 1}</NroLinDet>
    <NmbItem>Servicio de despacho </NmbItem>
    <DscItem>Servicio de despacho </DscItem>
    <PrcItem>${netoFlete}</PrcItem>
    <MontoItem>${netoFlete}</MontoItem>
    </Doc>`)
          : null;

        //ARMAR PAGOS
        let formaPagoXml = ""
        let montoCash = 0, montoDebit = 0, montoCredit = 0

        pagos.forEach(pago => {
          // console.log(pago)
          formaPagoXml += `<FormaPago>
          <Tipo>${pago.tipo_pago}</Tipo>
          <Monto>${pago.monto}</Monto>
          </FormaPago>`
          // if (pago.tipo == "Efectivo") {
          //   montoCash += pago.monto
          // } else if (pago.tipo == "Debito") {
          //   montoDebit += pago.monto
          // } else if (pago.tipo == "Credito") {
          //   montoCredit += pago.monto
          // }
          // pagosXML += `${pago.tipo} /`
        });

        // console.log("Formas de Pago: ")
        // console.log("Efectivo: ", montoCash)
        // console.log("Debito: ", montoDebit)
        // console.log("Credito", montoCredit)

        const xml = `<?xml version="1.0" encoding="ISO-8859-1"?>
        <Data>
        ${detalleProductos}
        ${Firma}
        ${formaPagoXml}
        </Data>
        `;
    console.log("xml: ", xml)
    
    // ${totalDescuentoPesosNeto ? `
    // <DscRcgGlobal>
    //   <NroLinDR>1</NroLinDR>
    //   <TpoMov>D</TpoMov>
    //   <GlosaDR>Descuento</GlosaDR>
    //   <TpoValor>$</TpoValor>
    //   <ValorDR>${totalDescuentoPesosNeto}</ValorDR>
    // </DscRcgGlobal>`: ''}

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
                  DocXml: xml,
                  Salida: 'T'
                };


                client.ObtenerPDF(args, function (err, result) {
                  if (err) {
                    console.error(err);
                    res.status(400).json({ msg: err.message });
                  } else {
                    // console.log("ResultPDF: ", result)
                    
                    parseString(result.ObtenerPDFResult, function (err, resultado) {
                      if (err) {
                        console.error(err);
                        res.status(400).json({ msg: err.message });
                      } else {
                        // console.log("resultado: ", resultado.Return.Data[0]);
                        
                        let data = resultado.Return.Data[0];
                        // let folio = data.Folio[0]
                        let pdf_b64_1 = data.Pdf[0];

                        let date = new Date();
                        let day = String(date.getDate()).padStart(2, '0');
                        let month = String(date.getMonth() + 1).padStart(2, '0'); // Los meses en JavaScript empiezan desde 0
                        let year = date.getFullYear();

                        let nombre_pdf = FolioDTE + "_" + day + month + year + ".pdf";

                        let pdf_b64_2 = Buffer.from(pdf_b64_1, 'base64');
                        fs.writeFileSync("../../boletas/" + nombre_pdf, pdf_b64_2);
                        console.log("Archivo Creado!!!!")


                        let response = {
                          'TipoDE': '39',
                          'folioDte': parseInt(FolioDTE),
                          'PDF': pdf_b64_1,
                        };

                        // console.log("responsePDF: ", response);
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


module.exports = {
  postPDF,
};
