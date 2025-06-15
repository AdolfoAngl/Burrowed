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
      // Guardar correo en sesión solo si es alumno
      if (correo.endsWith('@alumno.ipn.mx')) {
        await Registro.create({ nombre, apellido_paterno, apellido_materno, correo, carrera, password, credencial, rol: 'alumno', estado: 'activo' });
        req.session.correo = correo;
        res.redirect(`/dashboard-estudiante`);
      } else if (correo.endsWith('@ipn.mx')) {
        await Registro.create({ nombre, apellido_paterno, apellido_materno, correo, carrera, password, credencial, rol: 'profesor', estado: 'pendiente' });
        res.render('login', { error: 'Tu registro como profesor está pendiente de aprobación por el administrador.' });
      } else {
        res.render('login', { error: 'Correo no válido para registro.' });
      }
    } catch (error) {
      console.log(error);
      res.render('registro', { error: 'Hubo un error al registrar. Intenta de nuevo.' });
    }
  }
];
