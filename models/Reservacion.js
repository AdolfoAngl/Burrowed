import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const Reservacion = db.define('Reservacion', {
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
  horaInicio: {
    type: DataTypes.TIME,
    allowNull: false
  },
  horaFin: {
    type: DataTypes.TIME,
    allowNull: false
  },
  cupos: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  estado: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'disponible' // disponible, cerrada, cancelada
  }
});

export default Reservacion;
