import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const ReservacionAlumno = db.define('ReservacionAlumno', {
  reservacionId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  alumnoCorreo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  estado: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'activa' // activa, cancelada
  }
});

export default ReservacionAlumno;
