

const appController = async (req, res) => { //Async lo necesitas cuando hagas consultas a la base de datos
    //req es lo que recibes desde tu vista (navegador) y res es la respuesta que devuelves al cliente (navegador)

    //Por ejemplo para mostrar o renderizar una vista de pug es asi:
    //Ejemplo para usasr variables

    const webpage = 'https://www.danivegam.com'; //Variable de ejemplo

    //Puedes hacer consultas a la base de datos aqui, por ejemplo:
    // const propiedades = await Propiedad.findAll(
    res.render('home', {//Renderiza la vista home.pug
        //El primer parametro es el nombre de la vista que quieres renderizar   
        //El segundo parametro es un objeto que contiene las variables que quieres pasar a la vista
        //El objeto puede tener cualquier nombre, pero es recomendable que sea descriptivo
        
        //Aquí puedes anotar variables que le quieres pasar a la vista
        webpage, //Variable que le pasamos a la vista
        pageTitle: 'Inicio, soy una varibles y me asigno aqui mismo en el controller', //Titulo de la pagina
    })
}

// const searchEngine = async (req, res) =>{
//     const {termino} = req.body;
//     //Validar que termino no este vacío
//     if(!termino.trim())
//         return res.redirect('back');

//     //Consultar propiedades
//     const propiedades = await Propiedad.findAll({
//         where: {
//             titulo: {
//                 [Sequelize.Op.like] : '%' + termino + '%' //Con esto busca el termino en cualquier lugar del titulo
//             }
//         },
//         include: [
//             {model: Precio, as: 'precio'}
//         ]
//     })
    
//     res.render('busqueda', {
//         pagina: 'Resultados de la busqueda',
//         propiedades,
//         csrfToken: req.csrfToken(),
//         nombre: req.usuario?.nombre,
//         usuarioLogeado: req?.usuario !== null && req?.usuario !== undefined
//     })
// }

export{ //Recuerda poner aqui los nombres de tus controladores para que otros archivos los puedan leer
    appController
}