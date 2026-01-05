const oracledb = require('oracledb');

async function connectToDB() {
    console.log("Iniciando la conexión...");
    try {
        const connection = await oracledb.getConnection({
            user: 'system',  // Usuario de la base de datos
            password: 'BASEDEDATOSARIZONA2025',  // Actualizada
            connectString: 'localhost:1521/XEPDB1'  // Servicio correcto de Oracle XE 21c
        });
        console.log("Conexión exitosa a la base de datos");
        return connection;
    } catch (err) {
        console.error("Error de conexión: ", err);
    }
}

connectToDB();
