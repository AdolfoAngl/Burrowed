import Registro from '../models/Registro.js';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

// Configuración de Multer para guardar archivos en /public/credenciales
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../public/credenciales'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Mostrar formulario de registro
export const mostrarRegistro = (req, res) => {
  res.render('registro');
};

// Procesar registro
export const procesarRegistro = [
  upload.single('credencial'),
  async (req, res) => {
    try {
      const { nombre, apellido_paterno, apellido_materno, correo: correoOriginal, carrera, password } = req.body;
      const correo = correoOriginal.toLowerCase();
      const credencial = req.file ? req.file.filename : null;
      await Registro.create({ nombre, apellido_paterno, apellido_materno, correo, carrera, password, credencial });
      // Guardar correo en sesión
      req.session.correo = correo;
      // Redirigir según el tipo de correo
      if (correo.endsWith('@alumno.ipn.mx')) {
        res.redirect(`/dashboard-estudiante`);
      } else {
        res.redirect('/login');
      }
    } catch (error) {
      console.log(error);
      res.render('registro', { error: 'Hubo un error al registrar. Intenta de nuevo.' });
    }
  }
];
