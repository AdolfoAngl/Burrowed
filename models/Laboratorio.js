import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const Laboratorio = db.define('Laboratorio', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ubicacion: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

export default Laboratorio;
