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
import EventoAccedido from '../models/EventoAccedido.js';

// Controlador para login
const loginController = (req, res) => {
    res.render('login');
};

//Creamos el router 
const router = express.Router();

//Middleware para proteger rutas de admin
function requireAdmin(req, res, next) {
    if (req.session.correo === 'admin@burrowed.mx') {
        return next();
    }
    return res.redirect('/login');
}

// Middleware para pasar correo a todas las vistas
router.use((req, res, next) => {
    res.locals.correo = req.session.correo;
    next();
});

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
    if(email === 'admin@burrowed.mx' && password === 'admin') {
        req.session.correo = email; // Guardar en sesión
        return res.redirect('/admin/dashboard');
    }
    // Solo permitir login a correos de alumno o profesor
    if(!email.endsWith('@alumno.ipn.mx') && !email.endsWith('@ipn.mx')) {
        return res.render('login', { error: 'Correo o contraseña incorrectos.' });
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
router.get('/admin/dashboard', requireAdmin, async (req, res) => {
    const Registro = (await import('../models/Registro.js')).default;
    const Laboratorio = (await import('../models/Laboratorio.js')).default;
    const Prestamo = (await import('../models/Prestamo.js')).default;
    const Reservacion = (await import('../models/Reservacion.js')).default;
    const totalAlumnos = await Registro.count({ where: { correo: { [Op.like]: '%@alumno.ipn.mx' } } });
    const totalProfesores = await Registro.count({ where: { correo: { [Op.like]: '%@ipn.mx' }, rol: 'profesor' } });
    const totalLaboratorios = await Laboratorio.count();
    const totalReservaciones = await Reservacion.count();
    res.render('admin_dashboard', {
        totalAlumnos,
        totalProfesores,
        totalLaboratorios,
        totalReservaciones
    });
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
  const { nombre, apellido_paterno, apellido_materno, carrera, password } = req.body;
  const Registro = (await import('../models/Registro.js')).default;
  const usuario = await Registro.findOne({ where: { correo } });
  if (!usuario) return res.redirect('/login');
  usuario.nombre = nombre;
  usuario.apellido_paterno = apellido_paterno;
  usuario.apellido_materno = apellido_materno;
  usuario.carrera = carrera;
  if (req.file) usuario.credencial = req.file.filename;
  if (password && password.trim() !== '') {
    usuario.password = password;
  }
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
      materialImagen: material ? material.imagen : '',
      laboratorio: laboratorio ? laboratorio.nombre : '',
      profesor: '', // Puedes agregar lógica para asignar profesor
      estado: p.estado
    });
  }
  // Próximos eventos accedidos por PIN
  let eventosConSolicitar = [];
  let eventosAccedidosIds = [];
  if (correo) {
    const accedidos = await EventoAccedido.findAll({ where: { alumnoCorreo: correo } });
    eventosAccedidosIds = accedidos.map(e => e.eventoId);
  }
  if (eventosAccedidosIds.length) {
    const Evento = (await import('../models/Evento.js')).default;
    const Material = (await import('../models/Material.js')).default;
    const Laboratorio = (await import('../models/Laboratorio.js')).default;
    const eventos = await Evento.findAll({ where: { id: eventosAccedidosIds } });
    eventosConSolicitar = await Promise.all(eventos.map(async e => {
      const lab = await Laboratorio.findByPk(e.laboratorioId);
      const materialesIds = e.materiales.split(',').map(id => parseInt(id));
      const mats = await Material.findAll({ where: { id: materialesIds } });
      // Lógica de habilitación
      let puedeSolicitar = false;
      let yaSolicitado = false;
      const now = new Date();
      const fechaEvento = new Date(e.fecha);
      // El evento está habilitado solo si la fecha y hora actual está dentro de la ventana del evento
      if (
        now >= fechaEvento &&
        now <= new Date(fechaEvento.getTime() + 2 * 60 * 60 * 1000) // ventana de 2 horas por ejemplo
      ) {
        puedeSolicitar = true;
      }
      // Verificar si el alumno ya tiene préstamo para este evento
      const Prestamo = (await import('../models/Prestamo.js')).default;
      const prestamoExistente = await Prestamo.findOne({
        where: {
          alumnoCorreo: correo,
          laboratorioId: e.laboratorioId,
          profesor: e.profesorCorreo,
          estado: 'en curso'
        }
      });
      if (prestamoExistente) yaSolicitado = true;
      return {
        ...e.dataValues,
        laboratorioNombre: lab ? lab.nombre : 'Desconocido',
        fecha: e.fecha ? new Date(e.fecha).toLocaleString('es-MX') : '',
        materialesNombres: mats.map(m => m.nombre).join(', '),
        puedeSolicitar,
        yaSolicitado
      };
    }));
  }
  res.locals.proximosEventos = eventosConSolicitar;
  // Obtener reservaciones extracurriculares del alumno
  const Reservacion = (await import('../models/Reservacion.js')).default;
  const ReservacionAlumno = (await import('../models/ReservacionAlumno.js')).default;
  const reservacionesAlumno = await ReservacionAlumno.findAll({ where: { alumnoCorreo: correo, estado: 'activa' } });
  const reservaciones = await Promise.all(reservacionesAlumno.map(async ra => {
    const r = await Reservacion.findByPk(ra.reservacionId);
    if (!r) return null;
    const lab = await Laboratorio.findByPk(r.laboratorioId);
    // Calcular si el botón debe estar habilitado
    let puedeSolicitar = false;
    const now = new Date();
    if (r.fecha && r.horaInicio && r.horaFin) {
      // Unir fecha con horaInicio y horaFin para comparar correctamente
      const fechaStr = typeof r.fecha === 'string' ? r.fecha : r.fecha.toISOString().split('T')[0];
      const inicio = new Date(`${fechaStr}T${r.horaInicio}`);
      let fin = new Date(`${fechaStr}T${r.horaFin}`);
      // Si la hora de fin es menor o igual a la de inicio, sumar un día a fin
      if (fin <= inicio) {
        fin.setDate(fin.getDate() + 1);
      }
      if (now >= inicio && now <= fin) {
        puedeSolicitar = true;
      }
    }
    return {
      reservacionAlumnoId: ra.id,
      laboratorio: lab ? lab.nombre : '',
      fecha: r.fecha,
      horaInicio: r.horaInicio,
      horaFin: r.horaFin,
      profesor: r.profesorCorreo,
      estado: ra.estado,
      puedeSolicitar
    };
  }));
  res.render('estudiante_dashboard', { nombre: usuario.nombre, correo, prestamos, proximosEventos: res.locals.proximosEventos, reservaciones: reservaciones.filter(Boolean) });
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
  // Obtener reservaciones extracurriculares asignadas a este profesor
  const Reservacion = (await import('../models/Reservacion.js')).default;
  const ReservacionAlumno = (await import('../models/ReservacionAlumno.js')).default;
  const reservaciones = await Reservacion.findAll({ where: { profesorCorreo: correo } });
  // Mapear detalles de reservaciones
  const reservacionesDetalle = await Promise.all(reservaciones.map(async r => {
    const lab = await Laboratorio.findByPk(r.laboratorioId);
    const alumnos = await ReservacionAlumno.findAll({ where: { reservacionId: r.id, estado: 'activa' } });
    return {
      laboratorio: lab ? lab.nombre : '',
      fecha: r.fecha,
      horaInicio: r.horaInicio,
      horaFin: r.horaFin,
      alumnos: alumnos.map(a => a.alumnoCorreo),
      ocupados: alumnos.length,
      cupos: r.cupos,
      estado: r.estado
    };
  }));
  res.render('profesor_dashboard', { profesor, eventos: eventosConNombres, reservaciones: reservacionesDetalle });
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
  const { nombre, laboratorioId, fecha, materiales, horaInicio, horaFin } = req.body;
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
    horaInicio: horaInicio ? horaInicio + ':00' : '00:00:00',
    horaFin: horaFin ? horaFin + ':00' : '23:59:59',
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
  // Guardar el evento accedido en la base de datos y en sesión
  if (!req.session.eventosAccedidos) req.session.eventosAccedidos = [];
  if (!req.session.eventosAccedidos.includes(evento.id)) req.session.eventosAccedidos.push(evento.id);
  await EventoAccedido.findOrCreate({ where: { alumnoCorreo: req.session.correo, eventoId: evento.id } });
  // Obtener materiales del evento
  const materialesIds = evento.materiales.split(',').map(id => parseInt(id));
  const materiales = await Material.findAll({ where: { id: materialesIds } });
  res.render('evento_pin_materiales', { evento, materiales });
});

// Ruta para solicitar materiales de evento por PIN (alumno)
router.get('/evento-pin-materiales/:id', async (req, res) => {
  const Evento = (await import('../models/Evento.js')).default;
  const Material = (await import('../models/Material.js')).default;
  const evento = await Evento.findByPk(req.params.id);
  if (!evento) return res.send('Evento no encontrado');
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
  // Guardar el evento accedido en la base de datos y en sesión
  if (!req.session.eventosAccedidos) req.session.eventosAccedidos = [];
  if (!req.session.eventosAccedidos.includes(evento.id)) req.session.eventosAccedidos.push(evento.id);
  await EventoAccedido.findOrCreate({ where: { alumnoCorreo: correo, eventoId: evento.id } });
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

// API para consultar disponibilidad de laboratorios por fecha
router.get('/api/laboratorios/disponibilidad', async (req, res) => {
  const fecha = req.query.fecha;
  const Laboratorio = (await import('../models/Laboratorio.js')).default;
  const Reservacion = (await import('../models/Reservacion.js')).default;
  const Registro = (await import('../models/Registro.js')).default;
  // Buscar laboratorios extracurriculares disponibles ese día
  // Asegurarse de comparar solo la parte de la fecha (sin hora)
  const disponibles = await Reservacion.findAll({
    where: {
      fecha: new Date(fecha),
      estado: 'disponible'
    }
  });
  // Buscar todos los laboratorios
  const laboratorios = await Laboratorio.findAll();
  // Mapear laboratorios disponibles con profesor asignado y horas
  const ReservacionAlumno = (await import('../models/ReservacionAlumno.js')).default;
  const disponiblesLabs = await Promise.all(disponibles.map(async res => {
    const lab = laboratorios.find(l => l.id === res.laboratorioId);
    if (!lab) return null;
    const ocupados = await ReservacionAlumno.count({ where: { reservacionId: res.id, estado: 'activa' } });
    return {
      id: lab.id,
      nombre: lab.nombre,
      profesor: res.profesorCorreo,
      profesorCorreo: res.profesorCorreo,
      reservacionId: res.id,
      horaInicio: res.horaInicio,
      horaFin: res.horaFin,
      cupos: res.cupos,
      ocupados
    };
  }));
  res.json({ disponibles: disponiblesLabs.filter(Boolean) });
});

// Vista para consultar disponibilidad (alumno)
router.get('/consultar-laboratorio', (req, res) => {
  res.render('consultar_laboratorio');
});

// Procesar reservación de laboratorio
router.post('/reservar-laboratorio', async (req, res) => {
  const Reservacion = (await import('../models/Reservacion.js')).default;
  const ReservacionAlumno = (await import('../models/ReservacionAlumno.js')).default;
  const correo = req.session.correo;
  if (!correo) return res.redirect('/login');
  const { reservacionId } = req.body;
  // Buscar la reservación disponible
  const reservacion = await Reservacion.findByPk(reservacionId);
  if (!reservacion || reservacion.estado !== 'disponible') {
    return res.send('La reservación ya no está disponible.');
  }
  // Contar reservaciones activas
  const count = await ReservacionAlumno.count({ where: { reservacionId, estado: 'activa' } });
  if (count >= reservacion.cupos) {
    return res.send('Ya no hay cupos disponibles para esta reservación.');
  }
  // Verificar que el alumno no tenga ya una reservación activa para este horario
  const yaReservado = await ReservacionAlumno.findOne({ where: { reservacionId, alumnoCorreo: correo, estado: 'activa' } });
  if (yaReservado) {
    return res.send('Ya tienes una reservación activa para este laboratorio y horario.');
  }
  await ReservacionAlumno.create({ reservacionId, alumnoCorreo: correo, estado: 'activa' });
  res.redirect('/dashboard-estudiante');
});

// Vista para crear nueva reservación (admin)
router.get('/admin/reservaciones/nueva', async (req, res) => {
  const Laboratorio = (await import('../models/Laboratorio.js')).default;
  const Registro = (await import('../models/Registro.js')).default;
  const laboratorios = await Laboratorio.findAll();
  const profesores = await Registro.findAll({ where: { rol: 'profesor', estado: 'activo' } });
  res.render('admin_reservacion_nueva', { laboratorios, profesores });
});

// Procesar nueva reservación (admin)
router.post('/admin/reservaciones/nueva', async (req, res) => {
  const Reservacion = (await import('../models/Reservacion.js')).default;
  const { alumnoCorreo, laboratorioId, profesorCorreo, fecha } = req.body;
  await Reservacion.create({
    alumnoCorreo,
    laboratorioId,
    profesorCorreo,
    fecha,
    estado: 'pendiente'
  });
  res.redirect('/admin/dashboard');
});

// Vista para crear nueva disponibilidad extracurricular (admin)
router.get('/admin/laboratorios-extracurriculares/nuevo', async (req, res) => {
  const Laboratorio = (await import('../models/Laboratorio.js')).default;
  const Registro = (await import('../models/Registro.js')).default;
  const laboratorios = await Laboratorio.findAll();
  const profesores = await Registro.findAll({ where: { rol: 'profesor', estado: 'activo' } });
  res.render('admin_reservacion_nueva', { laboratorios, profesores });
});

// Procesar nueva disponibilidad extracurricular (admin)
router.post('/admin/laboratorios-extracurriculares/nuevo', async (req, res) => {
  const Reservacion = (await import('../models/Reservacion.js')).default;
  let { laboratorioId, profesorCorreo, fecha, horaInicio, horaFin, cupos } = req.body;
  laboratorioId = parseInt(laboratorioId);
  cupos = parseInt(cupos) || 1;
  fecha = fecha ? new Date(fecha) : null;
  horaInicio = horaInicio ? horaInicio + ':00' : null;
  horaFin = horaFin ? horaFin + ':00' : null;
  if (!laboratorioId || !profesorCorreo || !fecha || !horaInicio || !horaFin || !cupos) {
    return res.send('Faltan datos obligatorios.');
  }
  await Reservacion.create({
    laboratorioId,
    profesorCorreo,
    fecha,
    horaInicio,
    horaFin,
    cupos,
    estado: 'disponible'
  });
  res.redirect('/admin/dashboard');
});

// Historial de laboratorios extracurriculares (admin)
router.get('/admin/laboratorios-extracurriculares/historial', async (req, res) => {
  const Reservacion = (await import('../models/Reservacion.js')).default;
  const Laboratorio = (await import('../models/Laboratorio.js')).default;
  const Registro = (await import('../models/Registro.js')).default;
  // Buscar todas las reservaciones extracurriculares
  const reservaciones = await Reservacion.findAll({ order: [['fecha', 'DESC'], ['horaInicio', 'ASC']] });
  const ReservacionAlumno = (await import('../models/ReservacionAlumno.js')).default;
  // Mapear detalles
  const detalle = await Promise.all(reservaciones.map(async r => {
    const lab = await Laboratorio.findByPk(r.laboratorioId);
    const profesor = await Registro.findOne({ where: { correo: r.profesorCorreo } });
    const alumnos = await ReservacionAlumno.findAll({ where: { reservacionId: r.id, estado: 'activa' } });
    // Buscar nombres de alumnos
    const alumnosNombres = await Promise.all(alumnos.map(async a => {
      const reg = await Registro.findOne({ where: { correo: a.alumnoCorreo } });
      return reg ? { id: reg.id, nombre: `${reg.nombre} ${reg.apellido_paterno} ${reg.apellido_materno}` } : null;
    }));
    return {
      laboratorio: lab ? lab.nombre : '',
      fecha: r.fecha,
      horaInicio: r.horaInicio,
      horaFin: r.horaFin,
      profesor: profesor ? profesor.nombre : r.profesorCorreo,
      alumnos: alumnosNombres,
      cupos: r.cupos,
      ocupados: alumnos.length,
      estado: r.estado
    };
  }));
  res.render('admin_reservacion_historial', { reservaciones: detalle });
});

// Ruta para cancelar reservación (alumno)
router.post('/cancelar-reservacion', async (req, res) => {
  const ReservacionAlumno = (await import('../models/ReservacionAlumno.js')).default;
  const { reservacionAlumnoId } = req.body;
  const reservacion = await ReservacionAlumno.findByPk(reservacionAlumnoId);
  if (reservacion) {
    reservacion.estado = 'cancelada';
    await reservacion.save();
  }
  res.redirect('/dashboard-estudiante');
});

// Historial de préstamos para estudiante (modal)
router.get('/historial-prestamos', async (req, res) => {
  const correo = req.session.correo;
  if (!correo) return res.status(401).send('No autorizado');
  const Prestamo = (await import('../models/Prestamo.js')).default;
  // Buscar todos los préstamos del alumno
  const prestamos = await Prestamo.findAll({ where: { alumnoCorreo: correo } });
  // Mapear los datos para la vista parcial
  const prestamosData = prestamos.map(p => ({
    material: p.materialNombre || p.materialId || '-',
    laboratorio: p.laboratorioNombre || p.laboratorioId || '-',
    fechaPrestamo: p.fechaPrestamo ? p.fechaPrestamo.toLocaleString('es-MX') : '-',
    fechaDevolucion: p.fechaDevolucion ? p.fechaDevolucion.toLocaleString('es-MX') : '-',
    estado: p.estado
  }));
  res.render('partials/historial_prestamos_estudiante', { prestamos: prestamosData, layout: false });
});

// Historial real del alumno
router.get('/historial-alumno', async (req, res) => {
  const correo = req.session.correo;
  if (!correo) return res.redirect('/login');
  const Prestamo = (await import('../models/Prestamo.js')).default;
  const Material = (await import('../models/Material.js')).default;
  const Laboratorio = (await import('../models/Laboratorio.js')).default;
  // Buscar todos los préstamos del alumno
  const prestamosDB = await Prestamo.findAll({ where: { alumnoCorreo: correo } });
  // Mapear los datos para la vista
  const prestamos = await Promise.all(prestamosDB.map(async p => {
    const material = await Material.findByPk(p.materialId);
    const laboratorio = await Laboratorio.findByPk(p.laboratorioId);
    return {
      material: material ? material.nombre : 'Desconocido',
      materialImagen: material ? material.imagen : '',
      laboratorio: laboratorio ? laboratorio.nombre : 'Desconocido',
      fechaPrestamo: p.createdAt ? p.createdAt.toLocaleString('es-MX') : '',
      fechaDevolucion: p.updatedAt && p.estado !== 'en curso' ? p.updatedAt.toLocaleString('es-MX') : null,
      estadoDevolucion: p.estado !== 'en curso' ? p.estado : null,
      observaciones: p.observaciones || ''
    };
  }));
  res.render('historial_alumno', { prestamos });
});

// Vista para solicitar materiales de una reservación extracurricular
router.get('/solicitar-materiales', async (req, res) => {
  const { reservacion } = req.query;
  if (!reservacion) return res.redirect('/dashboard-estudiante');
  const ReservacionAlumno = (await import('../models/ReservacionAlumno.js')).default;
  const Reservacion = (await import('../models/Reservacion.js')).default;
  const Laboratorio = (await import('../models/Laboratorio.js')).default;
  const Material = (await import('../models/Material.js')).default;
  const ra = await ReservacionAlumno.findByPk(reservacion);
  if (!ra) return res.redirect('/dashboard-estudiante');
  const r = await Reservacion.findByPk(ra.reservacionId);
  if (!r) return res.redirect('/dashboard-estudiante');
  const laboratorio = await Laboratorio.findByPk(r.laboratorioId);
  const materiales = await Material.findAll({ where: { laboratorioId: laboratorio.id } });
  res.render('solicitar_materiales', { laboratorio, materiales, reservacionId: reservacion });
});

// Procesar solicitud de materiales para reservación extracurricular
router.post('/solicitar-materiales/:reservacionId/enviar', async (req, res) => {
  const correo = req.session.correo;
  if (!correo) return res.redirect('/login');
  const { reservacionId } = req.params;
  const ReservacionAlumno = (await import('../models/ReservacionAlumno.js')).default;
  const Reservacion = (await import('../models/Reservacion.js')).default;
  const ra = await ReservacionAlumno.findByPk(reservacionId);
  if (!ra) return res.redirect('/dashboard-estudiante');
  const r = await Reservacion.findByPk(ra.reservacionId);
  if (!r) return res.redirect('/dashboard-estudiante');
  const materiales = req.body['materiales[]'] || req.body.materiales;
  if (!materiales) return res.redirect(`/solicitar-materiales?reservacion=${reservacionId}`);
  const materialesArray = Array.isArray(materiales) ? materiales : [materiales];
  const Prestamo = (await import('../models/Prestamo.js')).default;
  for (const matId of materialesArray) {
    await Prestamo.create({
      alumnoCorreo: correo,
      laboratorioId: r.laboratorioId,
      materialId: matId,
      estado: 'en curso',
      reservacionAlumnoId: reservacionId
    });
  }
  res.redirect(`/dashboard-estudiante`);
});

// API para obtener materiales de un laboratorio
router.get('/api/materiales/:laboratorioId', async (req, res) => {
  const { laboratorioId } = req.params;
  try {
    const materiales = await Material.findAll({ where: { laboratorioId } });
    res.json(materiales);
  } catch (err) {
    res.status(500).json([]);
  }
});

// Dashboard profesor
router.get('/profesor/dashboard', async (req, res) => {
  const correo = req.session.correo;
  if (!correo) return res.redirect('/login');
  const Registro = (await import('../models/Registro.js')).default;
  const profesor = await Registro.findOne({ where: { correo } });
  if (!profesor) return res.redirect('/login');
  // Eventos del profesor
  const Evento = (await import('../models/Evento.js')).default;
  const eventos = await Evento.findAll({ where: { profesorCorreo: correo } });
  // Laboratorio y materiales para cada evento
  const Material = (await import('../models/Material.js')).default;
  const Laboratorio = (await import('../models/Laboratorio.js')).default;
  for (const e of eventos) {
    const lab = await Laboratorio.findByPk(e.laboratorioId);
    e.laboratorioNombre = lab ? lab.nombre : 'Desconocido';
    const materialesIds = e.materiales.split(',').map(id => parseInt(id));
    const mats = await Material.findAll({ where: { id: materialesIds } });
    e.materialesNombres = mats.map(m => m.nombre).join(', ');
  }
  // Reservaciones recientes (puedes ajustar la lógica según tu modelo)
  const Reservacion = (await import('../models/Reservacion.js')).default;
  const reservaciones = await Reservacion.findAll({ where: { profesorCorreo: correo }, order: [['fecha', 'DESC']], limit: 5 });
  res.render('profesor_dashboard', { profesor, eventos, reservaciones });
});

// Listado de eventos del profesor
router.get('/profesor/eventos', async (req, res) => {
  const correo = req.session.correo;
  if (!correo) return res.redirect('/login');
  const Evento = (await import('../models/Evento.js')).default;
  const eventos = await Evento.findAll({ where: { profesorCorreo: correo } });
  const Laboratorio = (await import('../models/Laboratorio.js')).default;
  const Material = (await import('../models/Material.js')).default;
  for (const e of eventos) {
    const lab = await Laboratorio.findByPk(e.laboratorioId);
    e.laboratorioNombre = lab ? lab.nombre : 'Desconocido';
    const materialesIds = e.materiales.split(',').map(id => parseInt(id));
    const mats = await Material.findAll({ where: { id: materialesIds } });
    e.materialesNombres = mats.map(m => m.nombre).join(', ');
  }
  res.render('profesor_eventos', { eventos });
});

// Perfil del profesor
router.get('/profesor/perfil', async (req, res) => {
  const correo = req.session.correo;
  if (!correo) return res.redirect('/login');
  const Registro = (await import('../models/Registro.js')).default;
  const profesor = await Registro.findOne({ where: { correo } });
  if (!profesor) return res.redirect('/login');
  res.render('profesor_perfil', { profesor });
});

// Editar perfil de profesor (GET)
router.get('/profesor/perfil/editar', async (req, res) => {
  const correo = req.session.correo;
  if (!correo) return res.redirect('/login');
  const Registro = (await import('../models/Registro.js')).default;
  const profesor = await Registro.findOne({ where: { correo } });
  if (!profesor) return res.redirect('/login');
  res.render('profesor_perfil_editar', { profesor });
});

// Editar perfil de profesor (POST)
router.post('/profesor/perfil/editar', async (req, res) => {
  const correo = req.session.correo;
  if (!correo) return res.redirect('/login');
  const { nombre, carrera, password } = req.body;
  const Registro = (await import('../models/Registro.js')).default;
  const profesor = await Registro.findOne({ where: { correo } });
  if (!profesor) return res.redirect('/login');
  profesor.nombre = nombre;
  profesor.carrera = carrera;
  if (password && password.trim() !== '') {
    profesor.password = password;
  }
  await profesor.save();
  res.redirect('/profesor/perfil');
});

export default router; //Este siempre dejalo, no lo borres