import supabase from './supabase.js'

// Leer datos
const { data, error } = await supabase
  .from('tu_tabla')
  .select('*')

if (error) console.error(error)
else console.log(data)

// Insertar
await supabase.from('reg_servicio').insert({ nombre: 'Juan' })

// Actualizar
await supabase.from('reg_servicio').update({ nombre: 'Pedro' }).eq('id', 1)

// Eliminar
await supabase.from('reg_servicio').delete().eq('id', 1)