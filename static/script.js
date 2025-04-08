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
    const minutosMax = 5; // 5 minutos total
    const segundosMax = minutosMax * 60; // 300 segundos

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
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4
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

    function calcularPromediosAcumuladosBloques(datos) {
        const bloqueTamano = 3;
        let promedios = [];
        let bloque = [];
        let promedioAnterior = 0;
        let totalDatosAcumulados = 0;

        for (let i = 0; i < datos.length; i++) {
            bloque.push(datos[i]);

            if (bloque.length === bloqueTamano || i === datos.length - 1) {
                let sumaBloque = bloque.reduce((a, b) => a + b, 0);
                let sumaTotal = sumaBloque + promedioAnterior;
                totalDatosAcumulados += bloque.length + (promedioAnterior > 0 ? 1 : 0);
                let nuevoPromedio = sumaTotal / totalDatosAcumulados;
                promedios.push(nuevoPromedio);

                promedioAnterior = nuevoPromedio;
                bloque = [];
            }
        }
        return promedios;
    }

    function actualizarGrafica() {
        graficaConsumo.data.labels = datosPulsos.map((_, i) => i + 1);
        graficaConsumo.data.datasets[0].data = datosPulsos;

        const promedios = calcularPromediosAcumuladosBloques(datosPulsos);

        // Expandir los promedios para unir los puntos
        let datosPromedioExpandido = [];
        let indiceBloque = 0;

        for (let i = 0; i < datosPulsos.length; i++) {
            if (i % 3 === 0 && indiceBloque < promedios.length) {
                datosPromedioExpandido.push(promedios[indiceBloque]);
                indiceBloque++;
            } else {
                datosPromedioExpandido.push(null);
            }
        }

        graficaConsumo.data.datasets[1].data = datosPromedioExpandido;

        graficaConsumo.update();
    }

    function actualizarDesdeServidor() {
        fetch('/ultimos_datos')
            .then(response => response.json())
            .then(data => {
                if (data.lecturas) {
                    const nuevasLecturas = data.lecturas;

                    if (nuevasLecturas.every(v => v === 0)) {
                        cerosConsecutivos++;
                        if (cerosConsecutivos >= 10) {
                            reiniciarTodo();
                        }
                        return; // No actualiza datos si solo recibe ceros
                    }

                    if (JSON.stringify(nuevasLecturas) !== JSON.stringify(ultimosDatos)) {
                        ultimosDatos = nuevasLecturas;
                        cerosConsecutivos = 0;

                        if (!flujoActivo) {
                            flujoActivo = true;
                            tiempoFlujo = 0;
                            iniciarTemporizador();
                        }

                        datosPulsos = nuevasLecturas;
                        const litrosTotales = nuevasLecturas.reduce((a, b) => a + b, 0);
                        inputConsumo.value = litrosTotales.toFixed(2);

                        actualizarGrafica();
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

            if (tiempoFlujo <= 240) { // 4 minutos (verde)
                luzVerde.style.display = 'block';
                luzRoja.style.display = 'none';
            } else { // después de 4 min (rojo)
                luzVerde.style.display = 'none';
                luzRoja.style.display = 'block';
            }

            if (tiempoFlujo >= segundosMax) { // Reinicio a los 5 minutos
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
        estadoActual.textContent = "Estado: Sin flujo";
        actualizarGrafica();
        luzVerde.style.display = 'none';
        luzRoja.style.display = 'none';
    }

    setInterval(actualizarDesdeServidor, 5000);
});
