const { response, request } = require("express");
const soap = require("soap");

const postBoleta = async (req, res = response) => {
  try {
    const { productos, total, iva, neto, totalFlete, fecha, vendedor,cliente,pagos } = req.body;
    //SE CREA CONNECCION SOAP
    console.log(req.body);
     
    const client = await soap.createClientAsync(`${process.env.URLDEV}`)
    
    client.addHttpHeader('facele.user', 'd5885a2db')
    client.addHttpHeader('facele.pass', 'JcbZmmyZW6AAJsL3CdhD/w==')

    //TOTAL DESCUENTOS. POR RAZONES COMERCIALES SE ESTABLECIO QUE EN LA BOLETA EL DESCUENTO SERIA GLOBAL
    const totalDescuentoPesosNeto = productos.reduce((acum, producto) => acum + (Math.round(producto.descuento_pesos/1.19)*producto.cantidad), 0);
    //CONSTRUIR DETALLE PRODUCTOS
    let detalleProductos = "";
    productos.forEach((producto, key) => {
      const netoProd = Math.round(producto.precio_unitario/1.19);
      console.log(netoProd);
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
    // ARMAR XML
    // const xml = `
    //   <DTE version="1.0">
    //   <Documento>
    //   <Encabezado>
    //     <IdDoc>
    //       <TipoDTE>39</TipoDTE>
    //       <Folio>0</Folio>
    //       <FchEmis>${fecha}</FchEmis>
    //       <IndServicio>3</IndServicio>
    //       <IndMntNeto>2</IndMntNeto>
    //     </IdDoc>
    //     <Emisor>
    //       <RUTEmisor>96666610-2</RUTEmisor>
    //       <RznSocEmisor>IMPORTACIONES EXIMBEN S.A.C</RznSocEmisor>
    //       <GiroEmisor>GRANDES TIENDAS, PERFUMERIAS, VESTUARIO, ACCESORIOS</GiroEmisor>
    //       <CdgSIISucur>78483501</CdgSIISucur>
    //       <DirOrigen>MANQUEHUE #2056,SANTIAGO</DirOrigen> 
    //       <CmnaOrigen>VITACURA</CmnaOrigen>
    //       <CiudadOrigen>SANTIAGO</CiudadOrigen>
    //     </Emisor>
    //     <Receptor>
    //       <RUTRecep>${cliente.rut=='1-9'?'66666666-6':cliente.rut}</RUTRecep>
    //       <RznSocRecep>${cliente.rut=='1-9'?'GENERICO':(`${cliente.nombres} ${cliente.apellidos}`)}</RznSocRecep>
    //       <CmnaRecep>${cliente.rut=='1-9'?'':cliente.comuna}</CmnaRecep>
    //       <CiudadRecep></CiudadRecep>
    //     </Receptor>
    //     <Totales>
    //       <MntNeto>${neto}</MntNeto>
    //       <IVA>${iva}</IVA>
    //       <MntTotal>${total}</MntTotal>
    //     </Totales>
    //   </Encabezado>
    // ${detalleProductos}
    // ${totalDescuentoPesosNeto?`
    // <DscRcgGlobal>
    //   <NroLinDR>1</NroLinDR>
    //   <TpoMov>D</TpoMov>
    //   <GlosaDR>Descuento</GlosaDR>
    //   <TpoValor>$</TpoValor>
    //   <ValorDR>${totalDescuentoPesosNeto}</ValorDR>
    // </DscRcgGlobal>`:''}
    //   </Documento>
    //     <A0>
    //     <A3>${vendedor}</A3>
    //     <A4>MANQUEHUE</A4>
    //     <A2>${pagosXML}</A2>
    //     <A10>OBSERVACIONES</A10>
    //   </A0>
    //   </DTE>`;

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
          <RUTRecep>${cliente.rut=='1-9'?'66666666-6':cliente.rut}</RUTRecep>
          <RznSocRecep>${cliente.rut=='1-9'?'GENERICO':(`${cliente.nombres} ${cliente.apellidos}`)}</RznSocRecep>
          <CmnaRecep>${cliente.rut=='1-9'?'':cliente.comuna}</CmnaRecep>
          <CiudadRecep></CiudadRecep>
        </Receptor>
        <Totales>
          <MntNeto>${neto}</MntNeto>
          <IVA>${iva}</IVA>
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
      </Documento>
        <A0>
        <A3>${vendedor}</A3>
        <A4>MANQUEHUE #2056,SANTIAGO</A4>
        <A2>${pagosXML}</A2>
        <A10>OBSERVACIONES</A10>
      </A0>
      </DTE>`;

    //argumentos de la consulta
    const args = {
      // rutEmisor: "96526630-5",
      rutEmisor: "96666610-2",
      tipoDTE: "39",
      formato: "XML_OBS",
      xml: xml,
    };

     console.log(xml); 
    const [respuesta] = await client.generaDTEAsync(args);
    if (respuesta.estadoOperacion === 0) {
      throw new Error(respuesta.descripcionOperacion);
    }
    // console.log(respuesta);
    res.status(200).json(respuesta);
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ msg: error.message });
  }
};

const getBoleta = async (req, res = response) => {
  const { folio } = req.params;
  const client = await soap.createClientAsync(`${process.env.URLDEV}`);
    client.addHttpHeader('facele.user', 'd5885a2db')
    client.addHttpHeader('facele.pass', 'JcbZmmyZW6AAJsL3CdhD/w==')
  const args = {
    // rutEmisor: "96526630-5",
    rutEmisor: "96666610-2",
    tipoDTE: "39",
    formato: "PDF_TERMICO",
    folioDTE: folio.toString(),
  };
  const [respuesta] = await client.obtieneDTEAsync(args);
  console.log((respuesta))
  res.status(200).json(respuesta);
};

module.exports = {
  postBoleta,
  getBoleta,
};
