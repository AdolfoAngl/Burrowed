import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const Evento = db.define('Evento', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  laboratorioId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  profesorCorreo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: false
  },
  materiales: {
    type: DataTypes.STRING, // Guardaremos los IDs separados por coma
    allowNull: false
  },
  pin: {
    type: DataTypes.STRING,
    allowNull: false
  },
  pinExpiracion: {
    type: DataTypes.DATE,
    allowNull: false
  }
});

export default Evento;
