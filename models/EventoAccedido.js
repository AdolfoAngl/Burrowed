import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const EventoAccedido = db.define('EventoAccedido', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  alumnoCorreo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  eventoId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

export default EventoAccedido;
