import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const Prestamo = db.define('Prestamo', {
  alumnoCorreo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  laboratorioId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  materialId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  estado: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'en curso'
  },
  observaciones: {
    type: DataTypes.STRING,
    allowNull: true
  },
  profesor: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

export default Prestamo;
