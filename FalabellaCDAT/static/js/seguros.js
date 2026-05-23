// Script para carrusel de Seguros Falabella con Bootstrap Cards

document.addEventListener('DOMContentLoaded', function () {
    const cardsTrack = document.getElementById('cardsTrack');
    const arrowLeft = document.getElementById('arrowLeft');
    const arrowRight = document.getElementById('arrowRight');

    const cards = document.querySelectorAll('.card');
    const totalCards = cards.length;
    const visibleCards = 4;
    const cardWidth = 18 * 16; // 18rem = 18*16px (288px)
    const gap = 20; // gap entre cards
    let currentPosition = 0;
    const maxPosition = totalCards - visibleCards; // 9 - 5 = 4

    console.log('Total cards encontradas:', totalCards);

    // Función para actualizar la posición del carrusel
    function updatePosition() {
        let displacement = (cardWidth + gap) * currentPosition;
        // En la última position, agregar solo 30px para que se vea la card 9 sin mucho espacio
        if (currentPosition === maxPosition) {
            displacement += 30;
        }
        cardsTrack.style.transform = `translateX(-${displacement}px)`;
        console.log('Position:', currentPosition, 'Displacement:', displacement, 'Muestra cards', currentPosition + 1, 'a', currentPosition + visibleCards);
    }

    // Función para mover a la derecha
    function moveRight() {
        // Permitir llegar a position 4 (cards 5-9) pero no más allá
        if (currentPosition < maxPosition) {
            currentPosition++;
            updatePosition();
        }
    }

    // Función para mover a la izquierda
    function moveLeft() {
        if (currentPosition > 0) {
            currentPosition--;
            updatePosition();
        }
    }

    // Event listeners para el carrusel
    arrowRight.addEventListener('click', moveRight);
    arrowLeft.addEventListener('click', moveLeft);

    console.log('Carrusel cargado. Max position:', maxPosition);

    // ========================================
    // LÓGICA NINJA: Sistema de vistas
    // ========================================

    const carruselView = document.getElementById('carruselView');
    const moduloView = document.getElementById('moduloView');
    const moduloContent = document.getElementById('moduloContent');
    const btnVolver = document.getElementById('btnVolver');
    const seguroLinks = document.querySelectorAll('.seguro-link');

    // Manejar clicks en los enlaces "Conoce más"
    seguroLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // Obtener el módulo del elemento padre (card)
            const card = this.closest('.seguro-card');
            const module = card.dataset.module;

            // Cargar el módulo
            loadSeguroModule(module);
        });
    });

    // Manejar clicks en toda la card (imagen, texto, etc)
    document.querySelectorAll('.seguro-card').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', function(e) {
            // No ejecutar si se hizo click en el botón
            if (e.target.classList.contains('seguro-link') || e.target.closest('.seguro-link')) {
                return;
            }

            const module = this.dataset.module;
            loadSeguroModule(module);
        });
    });

    // Función para cargar el módulo
    function loadSeguroModule(module) {
        // URL de la ruta en Flask
        const url = `/seguros/modulo/${module}`;

        // Mostrar loading
        moduloContent.innerHTML = '<div class="loading">Cargando información...</div>';

        // Fetch AJAX para cargar el contenido
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('Error al cargar el módulo');
                return response.text();
            })
            .then(html => {
                // Inyectar el HTML en el contenedor
                moduloContent.innerHTML = html;

                // Cambiar de vista: ocultar carrusel, mostrar módulo
                carruselView.style.display = 'none';
                moduloView.style.display = 'block';

                // Scroll suave hacia arriba
                setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 100);
            })
            .catch(error => {
                console.error('Error:', error);
                moduloContent.innerHTML = '<div class="alert alert-danger">Error al cargar la información del seguro.</div>';
            });
    }

    // Botón volver al menú
    btnVolver.addEventListener('click', function() {
        // Cambiar de vista: mostrar carrusel, ocultar módulo
        moduloView.style.display = 'none';
        carruselView.style.display = 'block';
        moduloContent.innerHTML = '';

        // Scroll suave hacia arriba
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    });
});
