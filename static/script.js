/* script.js

document.addEventListener('DOMContentLoaded', function() {
    let agua = document.querySelector('.agua');
    let consumoTexto = document.getElementById('consumo');
    let luzVerde = document.getElementById('verde');
    let luzRoja = document.getElementById('roja');
    let mensajeFuga = document.getElementById('mensaje-fuga');
    let inputConsumo = document.getElementById('input-consumo');
    let btnCalcular = document.getElementById('btn-calcular');

    // Cuando el usuario hace clic en el botón "Calcular"
    btnCalcular.addEventListener('click', () => {
        let consumo = parseFloat(inputConsumo.value);  // Obtener el valor ingresado por el usuario
        if (isNaN(consumo) || consumo < 0) {
            alert("Por favor, ingresa un valor válido para el consumo.");
            return;
        }

        // Actualizar el ancho de la barra de agua
        agua.style.width = `${(consumo / 100) * 100}%`;  // Asumiendo 100 litros como capacidad máxima
        consumoTexto.textContent = consumo;  // Actualizar el texto de consumo

        // Control del semáforo y mensaje de fuga
        controlarSemaforo(consumo);
    });

    // Función para controlar el semáforo y mostrar mensaje de fuga
    function controlarSemaforo(consumo) {
        if (consumo <= 40) {
            // Si el consumo es menor o igual a 40 litros, luz verde
            luzVerde.style.backgroundColor = 'green';
            luzRoja.style.backgroundColor = 'grey';
            mensajeFuga.style.display = 'none';  // Ocultar mensaje de fuga
        } else {
            // Si el consumo es mayor a 40 litros, luz roja y mostrar mensaje de fuga
            luzVerde.style.backgroundColor = 'grey';
            luzRoja.style.backgroundColor = 'red';
            mensajeFuga.style.display = 'block';  // Mostrar mensaje de fuga
        }
    }
});*/


document.getElementById('btn-calcular').addEventListener('click', function(event) {
    event.preventDefault();  // Evita el comportamiento por defecto de recargar la página
    
    const consumo = document.getElementById('input-consumo').value;

    // Verificar que el consumo no esté vacío
    if (consumo === "") {
        alert("Por favor, ingresa un valor de consumo.");
        return;
    }

    // Crear objeto para enviar los datos
    const data = {
        consumo: consumo
    };

    // Enviar los datos con Fetch API a tu servidor Flask
    fetch('/guardar_datos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error en la solicitud: ' + response.status);
        }
        return response.json();
    })
    .then(result => {
        // Lógica para manejar el resultado en la interfaz
        console.log('Resultado recibido del servidor:', result);  // Agregar este log para depuración
        document.getElementById('consumo').textContent = consumo;
        
        // Si el flujo es 1, mostrar alerta de fuga y cambiar luces del semáforo
        if (result.flujo === 1) {
            document.getElementById('mensaje-fuga').style.display = 'block';
            document.getElementById('verde').style.display = 'none';
            document.getElementById('roja').style.display = 'block';
        } else {
            document.getElementById('mensaje-fuga').style.display = 'none';
            document.getElementById('roja').style.display = 'none';
            document.getElementById('verde').style.display = 'block';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Ocurrió un error al intentar enviar los datos. Inténtalo de nuevo.');
    });
});
