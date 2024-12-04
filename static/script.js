document.addEventListener('DOMContentLoaded', function () {
    const agua = document.querySelector('.agua');
    const consumoTexto = document.getElementById('consumo');
    const luzVerde = document.getElementById('verde');
    const luzRoja = document.getElementById('roja');
    const mensajeFuga = document.getElementById('mensaje-fuga');
    const inputConsumo = document.getElementById('input-consumo');
    const btnCalcular = document.getElementById('btn-calcular');

    // Datos iniciales
    const datosPulsos = [2, 43, 69, 73, 74, 74, 76, 76, 77, 77, 77, 79, 79, 72, 64, 46, 3];
    const etiquetas = Array.from({ length: datosPulsos.length }, (_, i) => `Lectura ${i + 1}`);

    // Fórmula para calcular litros
    const calcularLitros = (pulsos) => 0.0017 * pulsos;

    // Calcular el consumo total en litros
    const consumoTotal = calcularLitros(datosPulsos.reduce((acc, val) => acc + val, 0));

    // Configuración de la gráfica
    const ctx = document.getElementById('grafica-consumo').getContext('2d');
    const graficaConsumo = new Chart(ctx, {
        type: 'line',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'Consumo de agua (litros)',
                data: datosPulsos.map(calcularLitros), // Convertir pulsos a litros
                borderColor: 'blue',
                borderWidth: 2,
                fill: false,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Lecturas',
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Consumo (litros)',
                    },
                    beginAtZero: true,
                }
            }
        }
    });

    // Actualización del botón Calcular
    btnCalcular.addEventListener('click', () => {
        // Mostrar el consumo total en el campo de texto
        inputConsumo.value = consumoTotal.toFixed(2); // Mostrar dos decimales

        // Actualizar el ancho de la barra de agua
        agua.style.width = `${(consumoTotal / 100) * 100}%`;
        consumoTexto.textContent = consumoTotal.toFixed(2);

        // Control del semáforo y mensaje de fuga
        controlarSemaforo(consumoTotal);
    });

    // Función para controlar el semáforo y mostrar mensaje de fuga
    function controlarSemaforo(consumo) {
        if (consumo < 12) {
            // Luz verde para consumos menores a 12 litros
            luzVerde.style.backgroundColor = 'green';
            luzRoja.style.backgroundColor = 'grey';
            mensajeFuga.style.display = 'none';
        } else {
            // Luz roja para consumos mayores o iguales a 12 litros
            luzVerde.style.backgroundColor = 'grey';
            luzRoja.style.backgroundColor = 'red';
            mensajeFuga.style.display = 'block';
        }
    }
});
