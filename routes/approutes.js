// routes/approutes.js
import express from 'express';
import { appController } from '../controllers/appController.js'; //Importamos el controlador
import { mostrarRegistro, procesarRegistro } from '../controllers/registroController.js'; // Importamos el controlador de registro
import multer from 'multer';
import Laboratorio from '../models/Laboratorio.js';
import Material from '../models/Material.js';
import Prestamo from '../models/Prestamo.js';

// Controlador para login
const loginController = (req, res) => {
    res.render('login');
};

//Creamos el router 
const router = express.Router();

//Pagina de inicio
router.get('/', appController); //RUTA, middleware, controller

// Página de login
router.get('/login', loginController);

// Procesar login
router.post('/login', async (req, res) => {
    // Limpiar y normalizar el correo
    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password;
    // Admin
    if(email === 'admin@escom.ipn.mx' && password === 'admin123') {
        req.session.correo = email; // Guardar en sesión
        return res.redirect('/admin/dashboard');
    }
    // Buscar usuario alumno
    const Registro = (await import('../models/Registro.js')).default;
    const usuario = await Registro.findOne({ where: { correo: email } });
    if(usuario && usuario.password === password && email.endsWith('@alumno.ipn.mx')) {
        req.session.correo = usuario.correo; // Guardar en sesión
        return res.redirect(`/dashboard-estudiante`);
    }
    // Si no, recarga el login con error
    res.render('login', { error: 'Correo o contraseña incorrectos.' });
});

// Dashboard admin
router.get('/admin/dashboard', (req, res) => {
    res.render('admin_dashboard');
});

// Vista de alumnos (simulada)
router.get('/admin/alumnos', (req, res) => {
  res.render('admin_alumnos', { alumnos: [] }); // Puedes pasar datos simulados si quieres
});

// Vista de laboratorios (con datos reales)
router.get('/admin/laboratorios', async (req, res) => {
  const laboratorios = await Laboratorio.findAll();
  res.render('admin_laboratorios', { laboratorios });
});

// Vista de inventario de laboratorio (con datos reales)
router.get('/admin/laboratorios/:id/inventario', async (req, res) => {
  const laboratorio = await Laboratorio.findByPk(req.params.id);
  const materiales = await Material.findAll({ where: { laboratorioId: req.params.id } });
  res.render('admin_inventario', { laboratorio, materiales });
});

// Vista para agregar material (con datos reales)
router.get('/admin/laboratorios/:id/materiales/nuevo', async (req, res) => {
  const laboratorio = await Laboratorio.findByPk(req.params.id);
  res.render('admin_material_nuevo', { laboratorio });
});

// Procesar agregar material (con datos reales)
const storageMaterial = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/materiales');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const uploadMaterial = multer({ storage: storageMaterial });

router.post('/admin/laboratorios/:id/materiales/nuevo', uploadMaterial.single('imagen'), async (req, res) => {
  const { nombre, cantidad, descripcion, estado } = req.body;
  const imagen = req.file ? req.file.filename : null;
  await Material.create({
    nombre,
    imagen,
    cantidad,
    descripcion,
    estado,
    laboratorioId: req.params.id
  });
  res.redirect(`/admin/laboratorios/${req.params.id}/inventario`);
});

// Página de registro
router.get('/registro', mostrarRegistro);
// Procesar registro
router.post('/registro', procesarRegistro);

// Página de perfil de estudiante
router.get('/perfil', async (req, res) => {
  const correo = req.session.correo;
  if (!correo) return res.redirect('/login');
  const Registro = (await import('../models/Registro.js')).default;
  const usuario = await Registro.findOne({ where: { correo } });
  if (!usuario) return res.redirect('/login');
  res.render('perfil_estudiante', {
    nombre: usuario.nombre,
    apellido_paterno: usuario.apellido_paterno,
    apellido_materno: usuario.apellido_materno,
    correo: usuario.correo,
    carrera: usuario.carrera,
    credencial: usuario.credencial
  });
});

// Página para editar perfil de estudiante
router.get('/perfil/editar', async (req, res) => {
  const correo = req.session.correo;
  if (!correo) return res.redirect('/login');
  const Registro = (await import('../models/Registro.js')).default;
  const usuario = await Registro.findOne({ where: { correo } });
  if (!usuario) return res.redirect('/login');
  res.render('editar_perfil', {
    nombre: usuario.nombre,
    apellido_paterno: usuario.apellido_paterno,
    apellido_materno: usuario.apellido_materno,
    correo: usuario.correo,
    carrera: usuario.carrera,
    credencial: usuario.credencial
  });
});

// Procesar edición de perfil
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storagePerfil = multer.diskStorage({
  destination: path.join(__dirname, '../public/credenciales'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const uploadPerfil = multer({ storage: storagePerfil });

router.post('/perfil/editar', uploadPerfil.single('credencial'), async (req, res) => {
  const correo = req.session.correo;
  const { nombre, apellido_paterno, apellido_materno, carrera } = req.body;
  const Registro = (await import('../models/Registro.js')).default;
  const usuario = await Registro.findOne({ where: { correo } });
  if (!usuario) return res.redirect('/login');
  usuario.nombre = nombre;
  usuario.apellido_paterno = apellido_paterno;
  usuario.apellido_materno = apellido_materno;
  usuario.carrera = carrera;
  if (req.file) usuario.credencial = req.file.filename;
  await usuario.save();
  res.redirect(`/perfil`);
});

// Ruta para cerrar sesión (destruye la sesión y redirige al login)
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Vista para agregar laboratorio
router.get('/admin/laboratorios/nuevo', (req, res) => {
  res.render('admin_laboratorio_nuevo');
});

// Procesar agregar laboratorio
router.post('/admin/laboratorios/nuevo', async (req, res) => {
  const { nombre, ubicacion } = req.body;
  await Laboratorio.create({ nombre, ubicacion });
  res.redirect('/admin/laboratorios');
});

// Vista para cambiar estado de material
router.get('/admin/laboratorios/:labId/materiales/:matId/estado', async (req, res) => {
  const laboratorio = await Laboratorio.findByPk(req.params.labId);
  const material = await Material.findByPk(req.params.matId);
  res.render('admin_material_estado', { laboratorio, material });
});

// Procesar cambio de estado
router.post('/admin/laboratorios/:labId/materiales/:matId/estado', async (req, res) => {
  const material = await Material.findByPk(req.params.matId);
  material.estado = req.body.estado;
  await material.save();
  res.redirect(`/admin/laboratorios/${req.params.labId}/inventario`);
});

// Eliminar material
router.get('/admin/laboratorios/:labId/materiales/:matId/eliminar', async (req, res) => {
  await Material.destroy({ where: { id: req.params.matId } });
  res.redirect(`/admin/laboratorios/${req.params.labId}/inventario`);
});

// Vista para editar material
router.get('/admin/laboratorios/:labId/materiales/:matId/editar', async (req, res) => {
  const laboratorio = await Laboratorio.findByPk(req.params.labId);
  const material = await Material.findByPk(req.params.matId);
  res.render('admin_material_editar', { laboratorio, material });
});

// Procesar edición de material
router.post('/admin/laboratorios/:labId/materiales/:matId/editar', uploadMaterial.single('imagen'), async (req, res) => {
  const material = await Material.findByPk(req.params.matId);
  material.nombre = req.body.nombre;
  material.cantidad = req.body.cantidad;
  material.descripcion = req.body.descripcion;
  if (req.file) material.imagen = req.file.filename;
  await material.save();
  res.redirect(`/admin/laboratorios/${req.params.labId}/inventario`);
});

// Vista para seleccionar laboratorio al solicitar préstamo
router.get('/solicitar-prestamo', async (req, res) => {
  const laboratorios = await Laboratorio.findAll();
  const correo = req.session.correo;
  if (!correo) return res.redirect('/login');
  res.render('solicitar_laboratorio', { laboratorios, correo });
});

// Vista para seleccionar materiales de un laboratorio
router.get('/solicitar-prestamo/:labId/materiales', async (req, res) => {
  const laboratorio = await Laboratorio.findByPk(req.params.labId);
  const materiales = await Material.findAll({ where: { laboratorioId: req.params.labId } });
  const correo = req.session.correo;
  if (!correo) return res.redirect('/login');
  res.render('solicitar_materiales', { laboratorio, materiales, correo });
});

// Procesar solicitud de préstamo
router.post('/solicitar-prestamo/:labId/enviar', async (req, res) => {
  // Usar el correo de la sesión
  const correo = req.session.correo;
  if (!correo) return res.redirect('/login');
  const materiales = req.body['materiales[]'] || req.body.materiales;
  if (!materiales) return res.redirect(`/solicitar-prestamo/${req.params.labId}/materiales`);
  // Permitir seleccionar uno o varios materiales
  const materialesArray = Array.isArray(materiales) ? materiales : [materiales];
  for (const matId of materialesArray) {
    await Prestamo.create({
      alumnoCorreo: correo,
      laboratorioId: req.params.labId,
      materialId: matId,
      estado: 'en curso'
    });
  }
  res.redirect(`/dashboard-estudiante`);
});

// Dashboard estudiante with real ongoing loans
router.get('/dashboard-estudiante', async (req, res) => {
  // Usar el correo de la sesión
  const correo = req.session.correo;
  if (!correo) return res.redirect('/login');
  const Registro = (await import('../models/Registro.js')).default;
  const usuario = await Registro.findOne({ where: { correo } });
  if (!usuario) return res.redirect('/login');
  // Obtener préstamos en curso
  const prestamosDB = await Prestamo.findAll({ where: { alumnoCorreo: correo, estado: 'en curso' } });
  // Obtener info de materiales y laboratorios
  const prestamos = [];
  for (const p of prestamosDB) {
    const material = await Material.findByPk(p.materialId);
    const laboratorio = await Laboratorio.findByPk(p.laboratorioId);
    prestamos.push({
      id: p.id,
      material: material ? material.nombre : '',
      laboratorio: laboratorio ? laboratorio.nombre : '',
      profesor: '', // Puedes agregar lógica para asignar profesor
      estado: p.estado
    });
  }
  res.render('estudiante_dashboard', { nombre: usuario.nombre, correo, prestamos });
});

// Ruta temporal para ver todos los usuarios registrados
router.get('/ver-usuarios', async (req, res) => {
  const Registro = (await import('../models/Registro.js')).default;
  const usuarios = await Registro.findAll();
  res.json(usuarios);
});

export default router; //Este siempre dejalo, no lo borres