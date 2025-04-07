document.addEventListener('DOMContentLoaded', function () {
    const inputConsumo = document.getElementById('input-consumo');
    const barraAgua = document.getElementById('barra-agua');
    const luzVerde = document.getElementById('verde');
    const luzRoja = document.getElementById('roja');
    const estadoActual = document.getElementById('estado-actual');
    const ctx = document.getElementById('grafica-consumo').getContext('2d');

    let datosPulsos = [];
    let flujoActivo = false;
    let tiempoFlujo = 0;
    let timer;
    let cerosConsecutivos = 0;
    let ultimosDatos = [];
    const minutosMax = 10; // 10 minutos
    const segundosMax = minutosMax * 60;

    const graficaConsumo = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Datos de consumo',
                    data: [],
                    borderColor: 'blue',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3
                },
                {
                    label: 'Promedio acumulado',
                    data: [],
                    borderColor: 'brown',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3
                }
            ]
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
                        text: 'Muestras',
                    },
                    ticks: {
                        callback: function (val) {
                            return val + 1;
                        }
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

    function calcularPromediosBloques(datos) {
        const bloqueTamano = 3;
        let promedios = [];
        let bloque = [];
        let promedioAnterior = 0;

        for (let i = 0; i < datos.length; i++) {
            bloque.push(datos[i]);

            if (bloque.length === bloqueTamano || i === datos.length - 1) {
                let suma = bloque.reduce((a, b) => a + b, 0);
                if (promedioAnterior !== 0) {
                    suma += promedioAnterior;
                    promedioAnterior = suma / (bloque.length + 1);
                } else {
                    promedioAnterior = suma / bloque.length;
                }
                promedios.push(promedioAnterior);
                bloque = [];
            }
        }
        return promedios;
    }

    function actualizarGrafica() {
        graficaConsumo.data.labels = datosPulsos.map((_, i) => i + 1);
        graficaConsumo.data.datasets[0].data = datosPulsos;

        const promedios = calcularPromediosBloques(datosPulsos);
        graficaConsumo.data.datasets[1].data = Array.from({ length: datosPulsos.length }, (_, i) => {
            const bloqueIndex = Math.floor(i / 3);
            return promedios[bloqueIndex] || null;
        });

        graficaConsumo.update();
    }

    function actualizarDesdeServidor() {
        fetch('/ultimos_datos')
            .then(response => response.json())
            .then(data => {
                if (data.lecturas && data.lecturas.length > 0) {
                    const nuevasLecturas = data.lecturas;

                    // Verificar cambios reales
                    if (JSON.stringify(nuevasLecturas) !== JSON.stringify(ultimosDatos)) {
                        ultimosDatos = nuevasLecturas;

                        if (!flujoActivo) {
                            flujoActivo = true;
                            tiempoFlujo = 0;
                            iniciarTemporizador();
                        }

                        datosPulsos = nuevasLecturas;
                        const litrosTotales = nuevasLecturas.reduce((a, b) => a + b, 0);
                        inputConsumo.value = litrosTotales.toFixed(2);

                        actualizarGrafica();

                        // Reset ceros consecutivos
                        cerosConsecutivos = 0;
                    } else {
                        // Verificar si todos los datos son ceros
                        if (nuevasLecturas.every(v => v === 0)) {
                            cerosConsecutivos += 1;
                            if (cerosConsecutivos >= 10) {
                                reiniciarTodo();
                            }
                        }
                    }
                }
            })
            .catch(error => console.error('Error al obtener lecturas:', error));
    }

    function iniciarTemporizador() {
        clearInterval(timer);
        timer = setInterval(() => {
            tiempoFlujo += 1;

            const porcentaje = Math.min((tiempoFlujo / segundosMax) * 100, 100);
            barraAgua.style.width = `${porcentaje}%`;

            // Actualizar color de la barra
            if (porcentaje <= 60) {
                barraAgua.style.backgroundColor = '#4da6ff'; // Azul
                estadoActual.textContent = "Estado: Consumo Adecuado (Azul)";
            } else if (porcentaje > 60 && porcentaje <= 80) {
                barraAgua.style.backgroundColor = 'orange'; // Naranja
                estadoActual.textContent = "Estado: Atención (Naranja)";
            } else {
                barraAgua.style.backgroundColor = 'red'; // Rojo
                estadoActual.textContent = "Estado: Fuga Detectada (Rojo)";
            }

            if (tiempoFlujo <= 480) { // Hasta 8 minutos (verde)
                luzVerde.style.display = 'block';
                luzRoja.style.display = 'none';
            } else { // Más de 8 minutos (rojo)
                luzVerde.style.display = 'none';
                luzRoja.style.display = 'block';
            }

            if (tiempoFlujo >= segundosMax) { // Reinicio automático a 10 min
                reiniciarTodo();
            }
        }, 1000);
    }

    function reiniciarTodo() {
        flujoActivo = false;
        clearInterval(timer);
        datosPulsos = [];
        ultimosDatos = [];
        cerosConsecutivos = 0;
        tiempoFlujo = 0;
        inputConsumo.value = '0.00';
        barraAgua.style.width = '0%';
        barraAgua.style.backgroundColor = '#4da6ff';
        actualizarGrafica();
        luzVerde.style.display = 'none';
        luzRoja.style.display = 'none';
        estadoActual.textContent = "Estado: Sin flujo";
    }

    setInterval(actualizarDesdeServidor, 5000);
});
