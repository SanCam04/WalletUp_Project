function cargarUsuarios() {
    fetch("https://jsonplaceholder.typicode.com/users")
        .then(response => response.json())
        .then(data => {
            let lista = document.getElementById("listaUsuarios");
            lista.innerHTML = "";
            data.forEach(usuario => {
                let item = document.createElement("li");
                item.className = "list-group-item";
                item.textContent = `${usuario.name} - ${usuario.address.city} - ${usuario.address.street} `;
                lista.appendChild(item);
            });
        })
        .catch(error => {
            console.error("Error al consumir la API:", error);
        });
}