import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const Registro = db.define('Registro', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  apellido_paterno: {
    type: DataTypes.STRING,
    allowNull: false
  },
  apellido_materno: {
    type: DataTypes.STRING,
    allowNull: false
  },
  correo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  carrera: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  credencial: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

export default Registro;
