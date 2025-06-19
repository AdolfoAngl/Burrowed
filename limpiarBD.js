import db from './config/db.js';
import Evento from './models/Evento.js';
import Laboratorio from './models/Laboratorio.js';
import Material from './models/Material.js';
import Prestamo from './models/Prestamo.js';
import Registro from './models/Registro.js';
import Reservacion from './models/Reservacion.js';
import ReservacionAlumno from './models/ReservacionAlumno.js';
import User from './models/User.js';
import fs from 'fs';
import path from 'path';

const ADMIN_CORREO = 'admin@burrwed.mx';
const CREDENCIALES_DIR = path.join(process.cwd(), 'public', 'credenciales');

async function limpiarBD() {
  try {
    await db.authenticate();
    // Eliminar datos de todas las tablas menos el admin
    await Evento.destroy({ where: {} });
    await Laboratorio.destroy({ where: {} });
    await Material.destroy({ where: {} });
    await Prestamo.destroy({ where: {} });
    await Reservacion.destroy({ where: {} });
    await ReservacionAlumno.destroy({ where: {} });
    await User.destroy({ where: {} });
    // Guardar el registro del admin
    const admin = await Registro.findOne({ where: { correo: ADMIN_CORREO } });
    let adminCredencial = null;
    if (admin) adminCredencial = admin.credencial;
    await Registro.destroy({ where: { correo: { [db.Sequelize.Op.ne]: ADMIN_CORREO } } });

    // Limpiar archivos de credenciales excepto el del admin
    if (fs.existsSync(CREDENCIALES_DIR)) {
      const files = fs.readdirSync(CREDENCIALES_DIR);
      for (const file of files) {
        if (!adminCredencial || file !== adminCredencial) {
          fs.unlinkSync(path.join(CREDENCIALES_DIR, file));
        }
      }
    }
    console.log('¡Base de datos y credenciales limpiadas!');
  } catch (err) {
    console.error('Error limpiando la base de datos:', err);
  } finally {
    await db.close();
  }
}

limpiarBD();
