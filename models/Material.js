import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const Material = db.define('Material', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  imagen: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: false
  },
  estado: {
    type: DataTypes.STRING,
    allowNull: false
  },
  laboratorioId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

export default Material;
