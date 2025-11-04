require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

const Usuario = require('../models/Usuario');

async function listUsers(){
  try{
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Conectado a MongoDB para listar usuarios');
    const users = await Usuario.find().select('-password').lean();
    console.log('Usuarios en la colección Usuario:');
    console.log(JSON.stringify(users, null, 2));
    await mongoose.disconnect();
    process.exit(0);
  }catch(err){
    console.error('Error al listar usuarios:', err.message);
    process.exit(1);
  }
}

listUsers();