// routes/approutes.js
import express from 'express';
import { Op } from 'sequelize';
import { appController } from '../controllers/appController.js'; //Importamos el controlador
import { mostrarRegistro, procesarRegistro } from '../controllers/registroController.js'; // Importamos el controlador de registro
import multer from 'multer';
import Laboratorio from '../models/Laboratorio.js';
import Material from '../models/Material.js';
import Prestamo from '../models/Prestamo.js';
import Evento from '../models/Evento.js';

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
    if(usuario && usuario.password === password) {
        if(usuario.rol === 'alumno' && usuario.estado === 'activo') {
            req.session.correo = usuario.correo;
            return res.redirect(`/dashboard-estudiante`);
        } else if(usuario.rol === 'profesor') {
            if(usuario.estado === 'pendiente') {
                return res.render('login', { error: 'Tu cuenta de profesor está pendiente de aprobación por el administrador.' });
            } else if(usuario.estado === 'rechazado') {
                return res.render('login', { error: 'Tu cuenta de profesor fue rechazada.' });
            } else if(usuario.estado === 'activo') {
                req.session.correo = usuario.correo;
                return res.redirect(`/dashboard-profesor`); // Aquí irá el dashboard de profesor
            }
        }
    }
    // Si no, recarga el login con error
    res.render('login', { error: 'Correo o contraseña incorrectos.' });
});

// Dashboard admin
router.get('/admin/dashboard', (req, res) => {
    res.render('admin_dashboard');
});

// Vista de alumnos (dinámica)
router.get('/admin/alumnos', async (req, res) => {
  const Registro = (await import('../models/Registro.js')).default;
  const alumnos = await Registro.findAll({ where: { correo: { [Op.like]: '%@alumno.ipn.mx' } } });
  // Obtener préstamos activos para cada alumno
  const Prestamo = (await import('../models/Prestamo.js')).default;
  const prestamos = await Prestamo.findAll({ where: { estado: 'en curso' } });
  // Contar préstamos activos por alumno
  const prestamosPorAlumno = {};
  prestamos.forEach(p => {
    prestamosPorAlumno[p.alumnoCorreo] = (prestamosPorAlumno[p.alumnoCorreo] || 0) + 1;
  });
  // Agregar campo prestamosActivos a cada alumno
  const alumnosConPrestamos = alumnos.map(a => ({
    ...a.dataValues,
    prestamosActivos: prestamosPorAlumno[a.correo] || 0
  }));
  res.render('admin_alumnos', { alumnos: alumnosConPrestamos });
});

// Vista de laboratorios (con datos reales)
router.get('/admin/laboratorios', async (req, res) => {
  const laboratorios = await Laboratorio.findAll();
  res.render('admin_laboratorios', { laboratorios });
});

// Vista de inventario de laboratorio (con datos reales y materiales en uso)
router.get('/admin/laboratorios/:id/inventario', async (req, res) => {
  const laboratorio = await Laboratorio.findByPk(req.params.id);
  const materiales = await Material.findAll({ where: { laboratorioId: req.params.id } });
  // Obtener préstamos en curso para este laboratorio
  const prestamos = await Prestamo.findAll({ where: { laboratorioId: req.params.id, estado: 'en curso' } });
  // Calcular cuántos de cada material están en uso
  const materialesEnUso = {};
  prestamos.forEach(p => {
    materialesEnUso[p.materialId] = (materialesEnUso[p.materialId] || 0) + 1;
  });
  // Agregar info de en uso y disponibles a cada material
  const materialesConEstado = materiales.map(mat => {
    const enUso = materialesEnUso[mat.id] || 0;
    return {
      ...mat.dataValues,
      enUso,
      disponibles: mat.cantidad - enUso
    };
  });
  res.render('admin_inventario', { laboratorio, materiales: materialesConEstado });
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
  // Próximos eventos accedidos por PIN
  if (req.session.eventosAccedidos && req.session.eventosAccedidos.length) {
    const Evento = (await import('../models/Evento.js')).default;
    const Material = (await import('../models/Material.js')).default;
    const Laboratorio = (await import('../models/Laboratorio.js')).default;
    const eventos = await Evento.findAll({ where: { id: req.session.eventosAccedidos } });
    const eventosConNombres = await Promise.all(eventos.map(async e => {
      const lab = await Laboratorio.findByPk(e.laboratorioId);
      const materialesIds = e.materiales.split(',').map(id => parseInt(id));
      const mats = await Material.findAll({ where: { id: materialesIds } });
      return {
        ...e.dataValues,
        laboratorioNombre: lab ? lab.nombre : 'Desconocido',
        fecha: e.fecha ? e.fecha.toLocaleString('es-MX') : '',
        materialesNombres: mats.map(m => m.nombre).join(', ')
      };
    }));
    res.locals.proximosEventos = eventosConNombres;
  } else {
    res.locals.proximosEventos = [];
  }
  res.render('estudiante_dashboard', { nombre: usuario.nombre, correo, prestamos, proximosEventos: res.locals.proximosEventos });
});

// Ruta temporal para ver todos los usuarios registrados
router.get('/ver-usuarios', async (req, res) => {
  const Registro = (await import('../models/Registro.js')).default;
  const usuarios = await Registro.findAll();
  res.json(usuarios);
});

// Vista de detalle de alumno
router.get('/admin/alumnos/:id', async (req, res) => {
  const Registro = (await import('../models/Registro.js')).default;
  const Prestamo = (await import('../models/Prestamo.js')).default;
  const Material = (await import('../models/Material.js')).default;
  // Buscar alumno
  const alumno = await Registro.findByPk(req.params.id);
  if (!alumno) return res.redirect('/admin/alumnos');
  // Buscar préstamos del alumno
  const prestamosDB = await Prestamo.findAll({ where: { alumnoCorreo: alumno.correo } });
  // Mapear préstamos con detalles
  const prestamos = await Promise.all(prestamosDB.map(async p => {
    const material = await Material.findByPk(p.materialId);
    return {
      material: material ? material.nombre : 'Desconocido',
      fechaPrestamo: p.createdAt ? p.createdAt.toLocaleString('es-MX') : '',
      fechaDevolucion: p.updatedAt && p.estado !== 'en curso' ? p.updatedAt.toLocaleString('es-MX') : null,
      estadoDevolucion: p.estado !== 'en curso' ? p.estado : null,
      observaciones: p.observaciones || '',
      reporte: p.reporte || null, // campo opcional para futuro
      profesor: p.profesor || null // campo opcional para futuro
    };
  }));
  res.render('admin_alumno_detalle', { alumno, prestamos });
});

// Ruta para procesar devolución de préstamo
router.post('/devolucion/:id', async (req, res) => {
  const Prestamo = (await import('../models/Prestamo.js')).default;
  const prestamo = await Prestamo.findByPk(req.params.id);
  if (!prestamo) return res.redirect('/dashboard-estudiante');
  // Actualizar estado y observaciones
  prestamo.estado = req.body.estado;
  prestamo.observaciones = req.body.observaciones || '';
  await prestamo.save();
  res.redirect('/dashboard-estudiante');
});

// Vista de profesores (listar y aprobar/rechazar)
router.get('/admin/profesores', async (req, res) => {
  const Registro = (await import('../models/Registro.js')).default;
  const profesores = await Registro.findAll({ where: { rol: 'profesor' } });
  res.render('admin_profesores', { profesores });
});

// Aprobar profesor
router.post('/admin/profesores/:id/aprobar', async (req, res) => {
  const Registro = (await import('../models/Registro.js')).default;
  const profesor = await Registro.findByPk(req.params.id);
  if (profesor && profesor.rol === 'profesor') {
    profesor.estado = 'activo';
    await profesor.save();
  }
  res.redirect('/admin/profesores');
});

// Rechazar profesor
router.post('/admin/profesores/:id/rechazar', async (req, res) => {
  const Registro = (await import('../models/Registro.js')).default;
  const profesor = await Registro.findByPk(req.params.id);
  if (profesor && profesor.rol === 'profesor') {
    profesor.estado = 'rechazado';
    await profesor.save();
  }
  res.redirect('/admin/profesores');
});

// Vista de detalle de profesor
router.get('/admin/profesores/:id', async (req, res) => {
  const Registro = (await import('../models/Registro.js')).default;
  const profesor = await Registro.findByPk(req.params.id);
  if (!profesor || profesor.rol !== 'profesor') return res.redirect('/admin/profesores');
  res.render('admin_profesor_detalle', { profesor });
});

// Dashboard profesor (con eventos creados)
router.get('/dashboard-profesor', async (req, res) => {
  const Registro = (await import('../models/Registro.js')).default;
  const Evento = (await import('../models/Evento.js')).default;
  const Material = (await import('../models/Material.js')).default;
  const Laboratorio = (await import('../models/Laboratorio.js')).default;
  const correo = req.session.correo;
  if (!correo) return res.redirect('/login');
  const profesor = await Registro.findOne({ where: { correo } });
  if (!profesor || profesor.rol !== 'profesor') return res.redirect('/login');
  // Obtener eventos creados por el profesor
  const eventos = await Evento.findAll({ where: { profesorCorreo: correo } });
  // Mapear nombres de laboratorio y materiales
  const eventosConNombres = await Promise.all(eventos.map(async e => {
    const lab = await Laboratorio.findByPk(e.laboratorioId);
    const materialesIds = e.materiales.split(',').map(id => parseInt(id));
    const mats = await Material.findAll({ where: { id: materialesIds } });
    return {
      ...e.dataValues,
      laboratorioNombre: lab ? lab.nombre : 'Desconocido',
      fecha: e.fecha ? e.fecha.toLocaleString('es-MX') : '',
      materialesNombres: mats.map(m => m.nombre).join(', ')
    };
  }));
  res.render('profesor_dashboard', { profesor, eventos: eventosConNombres });
});

// Vista para crear nuevo evento (profesor)
router.get('/profesor/evento/nuevo', async (req, res) => {
  const Laboratorio = (await import('../models/Laboratorio.js')).default;
  const Material = (await import('../models/Material.js')).default;
  const laboratorios = await Laboratorio.findAll();
  const materiales = await Material.findAll();
  res.render('profesor_evento_nuevo', { laboratorios, materiales });
});

// Procesar creación de evento
router.post('/profesor/evento/nuevo', async (req, res) => {
  const { nombre, laboratorioId, fecha, materiales } = req.body;
  const profesorCorreo = req.session.correo;
  if (!profesorCorreo) return res.redirect('/login');
  // Generar PIN de 6 dígitos
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  // Expira en 1 hora
  const pinExpiracion = new Date(Date.now() + 60 * 60 * 1000);
  // Materiales puede ser array o string
  const materialesStr = Array.isArray(materiales) ? materiales.join(',') : materiales;
  await Evento.create({
    nombre,
    laboratorioId,
    profesorCorreo,
    fecha,
    materiales: materialesStr,
    pin,
    pinExpiracion
  });
  res.render('profesor_evento_pin', { pin, pinExpiracion });
});

// Vista para que el alumno ingrese un PIN de evento
router.get('/evento-pin', (req, res) => {
  res.render('evento_pin_ingresar');
});

// Procesar PIN ingresado por alumno
router.post('/evento-pin', async (req, res) => {
  const { pin } = req.body;
  const Evento = (await import('../models/Evento.js')).default;
  const Material = (await import('../models/Material.js')).default;
  const evento = await Evento.findOne({ where: { pin } });
  if (!evento || new Date() > evento.pinExpiracion) {
    return res.render('evento_pin_ingresar', { error: 'PIN inválido o expirado.' });
  }
  // Guardar el evento accedido en la sesión del alumno
  if (!req.session.eventosAccedidos) req.session.eventosAccedidos = [];
  if (!req.session.eventosAccedidos.includes(evento.id)) req.session.eventosAccedidos.push(evento.id);
  // Obtener materiales del evento
  const materialesIds = evento.materiales.split(',').map(id => parseInt(id));
  const materiales = await Material.findAll({ where: { id: materialesIds } });
  res.render('evento_pin_materiales', { evento, materiales });
});

// Procesar solicitud de materiales por PIN (alumno)
router.post('/evento-pin/solicitar/:eventoId', async (req, res) => {
  const Evento = (await import('../models/Evento.js')).default;
  const Prestamo = (await import('../models/Prestamo.js')).default;
  const evento = await Evento.findByPk(req.params.eventoId);
  if (!evento) return res.redirect('/evento-pin');
  const correo = req.session.correo;
  if (!correo) return res.redirect('/login');
  // Guardar el evento accedido en la sesión del alumno
  if (!req.session.eventosAccedidos) req.session.eventosAccedidos = [];
  if (!req.session.eventosAccedidos.includes(evento.id)) req.session.eventosAccedidos.push(evento.id);
  // Materiales del evento
  const materialesIds = evento.materiales.split(',').map(id => parseInt(id));
  for (const matId of materialesIds) {
    await Prestamo.create({
      alumnoCorreo: correo,
      laboratorioId: evento.laboratorioId,
      materialId: matId,
      estado: 'en curso',
      profesor: evento.profesorCorreo // campo opcional para integración
    });
  }
  res.redirect('/dashboard-estudiante');
});

// Historial de eventos de un profesor (admin)
router.get('/admin/profesores/:id/eventos', async (req, res) => {
  const Registro = (await import('../models/Registro.js')).default;
  const Evento = (await import('../models/Evento.js')).default;
  const Material = (await import('../models/Material.js')).default;
  const Laboratorio = (await import('../models/Laboratorio.js')).default;
  const profesor = await Registro.findByPk(req.params.id);
  if (!profesor || profesor.rol !== 'profesor') return res.redirect('/admin/profesores');
  const eventos = await Evento.findAll({ where: { profesorCorreo: profesor.correo } });
  // Mapear nombres de laboratorio y materiales
  const eventosConNombres = await Promise.all(eventos.map(async e => {
    const lab = await Laboratorio.findByPk(e.laboratorioId);
    const materialesIds = e.materiales.split(',').map(id => parseInt(id));
    const mats = await Material.findAll({ where: { id: materialesIds } });
    return {
      ...e.dataValues,
      laboratorioNombre: lab ? lab.nombre : 'Desconocido',
      fecha: e.fecha ? e.fecha.toLocaleString('es-MX') : '',
      materialesNombres: mats.map(m => m.nombre).join(', ')
    };
  }));
  res.render('admin_profesor_eventos', { eventos: eventosConNombres });
});

export default router; //Este siempre dejalo, no lo borres