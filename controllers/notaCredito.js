const { response, request } = require("express");
const soap = require("soap");

const getNotaCredito = async (req, res = response) => {
  const { folio } = req.params;
  const client = await soap.createClientAsync(`${process.env.URLDEV}`);
    client.addHttpHeader('facele.user', 'd5885a2db')
    client.addHttpHeader('facele.pass', 'JcbZmmyZW6AAJsL3CdhD/w==')
  const args = {
    // rutEmisor: "96526630-5",
    rutEmisor: "96666610-2",
    tipoDTE: "61",
    formato: "PDF_TERMICO",
    folioDTE: folio.toString(),
  };
  const [respuesta] = await client.obtieneDTEAsync(args);
  console.log((respuesta))
  res.status(200).json(respuesta);
};

const postNotaCredito = async (req, res = response) => {
  console.log(req.body);
  
  try {
    
    const { folio, productos, total, iva, neto, totalFlete, fecha, cliente,pagos } = req.body;

    const fechaRes = fecha;
    const fechaConFormato = fechaRes.substr(0, 10);
    const fechaActual = new Date().toISOString().substr(0, 10);

    const client = await soap.createClientAsync(`${process.env.URLDEV}`);

    client.addHttpHeader('facele.user', 'd5885a2db')
    client.addHttpHeader('facele.pass', 'JcbZmmyZW6AAJsL3CdhD/w==')

    //TOTAL DESCUENTOS. POR RAZONES COMERCIALES SE ESTABLECIO QUE EN LA BOLETA EL DESCUENTO SERIA GLOBAL
    const totalDescuentoPesosNeto = productos.reduce((acum, producto) => acum + (Math.round(producto.descuento_unitario_pesos/1.19)*producto.cantidad), 0);
    //CONSTRUIR DETALLE PRODUCTOS
    let detalleProductos = "";
    productos.forEach((producto, key) => {
      const netoProd = producto.precio_unitario_neto;
      console.log(netoProd);
      detalleProductos += `  
      <Detalle>
      <NroLinDet>${key + 1}</NroLinDet>
      <CdgItem>
      <TpoCodigo>COD</TpoCodigo>
      <VlrCodigo>${producto.ean13}</VlrCodigo>
      </CdgItem>
      <NmbItem>${producto.descripcion}</NmbItem>
      <QtyItem>${producto.cantidad}</QtyItem>
      <PrcItem>${netoProd}</PrcItem>
      <MontoItem>${netoProd * producto.cantidad}</MontoItem>
      </Detalle>`;
    });
    //SI HAY FLETE AGREGAR AL DETALLE

    const netoFlete = Math.round(totalFlete/1.19);

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
    pagos.forEach(pago => {
      pagosXML+= `${pago.tipo} /`
    });
    
    const xml = `
      <DTE version="1.0">
      <Documento ID="DTE-61-2-96666610-2">
      <Encabezado>
        <IdDoc>
          <TipoDTE>61</TipoDTE>
          <Folio></Folio>
          <FchEmis>${fechaActual}</FchEmis>

        </IdDoc>
        <Emisor>
          <RUTEmisor>96666610-2</RUTEmisor>
          <RznSoc>VILU S A</RznSoc>
          <GiroEmis>GRANDES TIENDAS, PERFUMERIAS, VESTUARIO, ACCESORIOS</GiroEmis>
          <Acteco>469000</Acteco>
          <Acteco>471910</Acteco>
          <Acteco>522120</Acteco>
          <Acteco>681011</Acteco>
          <CdgSIISucur>88016549</CdgSIISucur>
          <DirOrigen>MANQUEHUE #2056,SANTIAGO</DirOrigen> 
          <CmnaOrigen>VITACURA</CmnaOrigen>
          <CiudadOrigen>SANTIAGO</CiudadOrigen>
          <CdgVendedor></CdgVendedor>
        </Emisor>
        <Receptor>
          <RUTRecep>${cliente.rut=='1-9'?'66666666-6':cliente.rut}</RUTRecep>
          <RznSocRecep>${cliente.rut=='1-9'?'GENERICO':(`${cliente.nombres} ${cliente.apellidos}`)}</RznSocRecep>
          <GiroRecep>NO INFORMADO</GiroRecep>
          <DirRecep>N/A</DirRecep>
          <CmnaRecep>${cliente.rut=='1-9'?'':cliente.comuna}</CmnaRecep>
          <CiudadRecep>N/A</CiudadRecep>
        </Receptor>
        <Transporte/>
        <Totales>
          <MntNeto>${neto}</MntNeto>
          <MntExe>0</MntExe>
          <TasaIVA>19</TasaIVA>
          <IVA>${iva}</IVA>
          <CredEC>0</CredEC>   
          <MntTotal>${total}</MntTotal>
        </Totales>
      </Encabezado>
    ${detalleProductos}
    ${totalDescuentoPesosNeto?`
    <DscRcgGlobal>
      <NroLinDR>1</NroLinDR>
      <TpoMov>D</TpoMov>
      <GlosaDR>Descuento</GlosaDR>
      <TpoValor>$</TpoValor>
      <ValorDR>${totalDescuentoPesosNeto}</ValorDR>
    </DscRcgGlobal>`:''}
    <Referencia>
      <NroLinRef>1</NroLinRef>
      <TpoDocRef>39</TpoDocRef>
      <FolioRef>${folio}</FolioRef>
      <FchRef>${fechaConFormato}</FchRef>
      <CodRef>1</CodRef>
      <RazonRef>Anula Documento</RazonRef>
    </Referencia>
          
      </Documento>

      </DTE>`;

  //   const xml = `
    
  //   <DTE version="1.0">
  //   <Documento ID="DTE-61-2-96666610-2">
  //   <Encabezado>
  //   <IdDoc>
  //   <TipoDTE>61</TipoDTE>
  //   <Folio></Folio>
  //   <FchEmis>2023-05-15</FchEmis>
  //   </IdDoc>
  //   <Emisor>
  //   <RUTEmisor>96666610-2</RUTEmisor>
  //   <RznSoc>VILU S A</RznSoc>
  //   <GiroEmis>GRANDES TIENDAS, PERFUMERIAS, VESTUARIO, ACCESORIOS</GiroEmis>
  //   <Acteco>469000</Acteco>
  //   <Acteco>471910</Acteco>
  //   <Acteco>522120</Acteco>
  //   <Acteco>681011</Acteco>
  //   <CdgSIISucur>88016549</CdgSIISucur>
  //   <DirOrigen>MANQUEHUE #2056,SANTIAGO</DirOrigen>
  //   <CmnaOrigen>VITACURA</CmnaOrigen>
  //   <CiudadOrigen>SANTIAGO</CiudadOrigen>
  //   <CdgVendedor>Facele Admin</CdgVendedor>
  //   </Emisor>
  //   <Receptor>
  //     <RUTRecep>12231810-9</RUTRecep>
  //     <RznSocRecep>francisco rojas</RznSocRecep>
  //     <GiroRecep>NO INFORMADO</GiroRecep>
  //     <DirRecep>N/A</DirRecep>
  //     <CmnaRecep>Santiago</CmnaRecep>
  //     <CiudadRecep>N/A</CiudadRecep>
  //   </Receptor>
  //   <Transporte/>
  //   <Totales>
  //     <MntNeto>52933</MntNeto>
  //     <MntExe>0</MntExe>
  //     <TasaIVA>19</TasaIVA>
  //     <IVA>10057</IVA>
  //     <CredEC>0</CredEC>
  //     <MntTotal>62990</MntTotal>
  //   </Totales>
  //   </Encabezado>
  //   <Detalle>
  //   <NroLinDet>1</NroLinDet>
  //   <CdgItem>
  //   <TpoCodigo>COD</TpoCodigo>
  //   <VlrCodigo>3432240003645</VlrCodigo>
  //   </CdgItem>
  //   <NmbItem>Cartier Santos Concentree EDT 100ML</NmbItem>
  //   <QtyItem>1</QtyItem>
  //   <PrcItem>52933</PrcItem>
  //   <MontoItem>52933</MontoItem>
  //   </Detalle>
  //   <Referencia>
  //   <NroLinRef>1</NroLinRef>
  //   <TpoDocRef>39</TpoDocRef>
  //   <FolioRef>754</FolioRef>
  //   <FchRef>2023-03-21</FchRef>
  //   <CodRef>1</CodRef>
  //   <RazonRef>Anula Documento</RazonRef>
  // </Referencia>
  //   </Documento>
  //   </DTE>

  //   `

  //   const xml = `
  //   <DTE version="1.0">
  //   <Documento ID="DTE-61-2-96666610-2">
  //   <Encabezado>
  //     <IdDoc>
  //       <TipoDTE>61</TipoDTE>
  //       <Folio></Folio>
  //       <FchEmis>2023-05-15</FchEmis>

  //     </IdDoc>
  //     <Emisor>
  //     <RUTEmisor>96666610-2</RUTEmisor>
  //     <RznSoc>VILU S A</RznSoc>
  //     <GiroEmis>GRANDES TIENDAS, PERFUMERIAS, VESTUARIO, ACCESORIOS</GiroEmis>
  //     <Acteco>469000</Acteco>
  //     <Acteco>471910</Acteco>
  //     <Acteco>522120</Acteco>
  //     <Acteco>681011</Acteco>
  //     <CdgSIISucur>88016549</CdgSIISucur>
  //     <DirOrigen>MANQUEHUE #2056,SANTIAGO</DirOrigen>
  //     <CmnaOrigen>VITACURA</CmnaOrigen>
  //     <CiudadOrigen>SANTIAGO</CiudadOrigen>
  //     <CdgVendedor>Facele Admin</CdgVendedor>
  //     </Emisor>
  //     <Receptor>
  //       <RUTRecep>12231810-9</RUTRecep>
  //       <RznSocRecep>francisco rojas</RznSocRecep>
  //       <GiroRecep>NO INFORMADO</GiroRecep>
  //       <DirRecep>N/A</DirRecep>
  //       <CmnaRecep>Santiago</CmnaRecep>
  //       <CiudadRecep>N/A</CiudadRecep>
  //     </Receptor>
  //     <Transporte/>
  //     <Totales>
  //       <MntNeto>52933</MntNeto>
  //       <MntExe>0</MntExe>
  //       <TasaIVA>19</TasaIVA>
  //       <IVA>10057</IVA>
  //       <CredEC>0</CredEC>
  //       <MntTotal>62990</MntTotal>
  //     </Totales>
  //   </Encabezado>

  //   <Detalle>
  //   <NroLinDet>1</NroLinDet>
  //   <CdgItem>
  //   <TpoCodigo>COD</TpoCodigo>
  //   <VlrCodigo>3432240003645</VlrCodigo>
  //   </CdgItem>
  //   <NmbItem>Cartier Santos Concentree EDT 100ML</NmbItem>
  //   <QtyItem>1</QtyItem>
  //   <PrcItem>52933</PrcItem>
  //   <MontoItem>52933</MontoItem>
  //   </Detalle>

  // <Referencia>
  //   <NroLinRef>1</NroLinRef>
  //   <TpoDocRef>39</TpoDocRef>
  //   <FolioRef>754</FolioRef>
  //   <FchRef>2023-03-21</FchRef>
  //   <CodRef>1</CodRef>
  //   <RazonRef>Anula Documento</RazonRef>
  // </Referencia>

  //   </Documento>

  //   </DTE>

  //   `

    //argumentos de la consulta
    
    
    const args = {
      // rutEmisor: "96526630-5",
      rutEmisor: "96666610-2",
      tipoDTE: "61", // 39 Boleta Electronica - 60 Nota Credito
      formato: "XML_OBS",
      xml: xml,
    };

     console.log(xml); 
     const [respuesta] = await client.generaDTEAsync(args);
     console.log(respuesta); 
    if (respuesta.estadoOperacion === 0) {
      throw new Error(respuesta.descripcionOperacion);
    }
    // console.log(respuesta);
    res.status(200).json(respuesta);


  } catch (error) {
    console.log(error);
    res.status(400).json({ msg: error.message });
  }

}

module.exports = {
  getNotaCredito, postNotaCredito
};
