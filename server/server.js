const express = require("express");
const cors = require("cors");

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT;
    this.boleta = "/api/boleta";
    this.docele = "/api/boletadocele"
    this.notaCredito = "/api/notacredito";
    this.pdf = "/api/pdf";
    // Middlewares
    this.middlewares();
    // Rutas de mi aplicación
    this.routes();
  }
  middlewares() {
    // CORS
    const corsOptions = {
      origin: 'https://www.vicencio.cl',
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    };
    
    // this.app.use(cors(corsOptions));
    this.app.use(cors());
    
    // Lectura y parseo del body
    this.app.use(express.json());
    // Directorio Público
    this.app.use(express.static("public"));
  }

  routes() {
    this.app.use(this.boleta, require("../routes/boleta"));
    this.app.use(this.docele, require("../routes/boletadocele"));
    this.app.use(this.notaCredito, require("../routes/notaCredito"));
    this.app.use(this.pdf, require("../routes/pdf"));
  }
  listen() {
    this.app.listen(this.port, () => {
      console.log("Servidor corriendo en puerto", this.port);
    });
  }
}

module.exports = Server;
