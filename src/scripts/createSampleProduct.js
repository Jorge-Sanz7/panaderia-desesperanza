require('dotenv').config();
const mongoose = require('mongoose');
const Producto = require('../models/Producto');

async function createSample(){
  try{
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Conectado a MongoDB para crear producto de ejemplo');

    const sample = new Producto({
      nombre: 'Concha de Halloween',
      precio: 25.5,
      cantidad: 50,
      categoria: 'temporada',
      temporada: 'halloween',
      descripcion: 'Concha especial de Halloween'
    });

    const saved = await sample.save();
    console.log('Producto creado:');
    console.log(JSON.stringify(saved, null, 2));
    await mongoose.disconnect();
    process.exit(0);
  }catch(err){
    console.error('Error al crear producto:', err.message);
    process.exit(1);
  }
}

createSample();