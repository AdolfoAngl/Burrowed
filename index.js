// const express = require("express"); //Common JS
import express from 'express';
import appRoutes from './routes/approutes.js';
import db from './config/db.js';
import User from './models/User.js';
import Laboratorio from './models/Laboratorio.js';
import Material from './models/Material.js';
import sessionMiddleware from './config/session.js';

// import csrf from 'csurf'
// import cookieParser from 'cookie-parser';
// import usuarioRoutes from './routes/usuarioRoutes.js';
// import propiedadesRoutes from './routes/propiedadesRoutes.js';
// import appRoutes from './routes/appRoutes.js';
// import apiRoutes from './routes/apiRoutes.js';

//Crear la app
// importamos express y creamos una instancia de la aplicación
const app = express();

//Habilitar lectura de datos de formularios
app.use(express.urlencoded({extended: true}));

// Habilitar sesiones
app.use(sessionMiddleware);

// //Habilitar cookie parser
// app.use(cookieParser());

//Habilitar CSRF
// app.use(csrf({cookie: true}));

//Conexion a la base de datos
try {
    await db.authenticate();
    await db.sync();
    console.log('Conexión establecida con la BD');
    // Crear un usuario de prueba (opcional)
    // await User.create({ name: 'Ejemplo', email: 'ejemplo@email.com' });
} catch (error) {
    console.log(error);
}

// Eliminar todos los registros de la tabla User (solo ejecutar una vez)
// await User.destroy({ where: {} });

//Habilitar pug
app.set("view engine", "pug");
app.set("views", "./views");

// Carpeta pública
app.use(express.static('public'));

//Routing
app.use('/', appRoutes); 
    //Aqui "use" lo que hace a diferencia de use busca las rutas que empiezen con algo
    //Get solo busca rutas exactas

//Definir un puerto y arrancar el proyecto
const port  = process.env.PORT || 3000;

app.listen(port, ()=>{
    console.log(`El servidor esta funcionanto en el puerto: ${port}`);
});

// Relación: Un laboratorio tiene muchos materiales
Laboratorio.hasMany(Material, { foreignKey: 'laboratorioId' });
Material.belongsTo(Laboratorio, { foreignKey: 'laboratorioId' });
