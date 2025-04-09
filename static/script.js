document.addEventListener('DOMContentLoaded', function () {
    const inputConsumo = document.getElementById('input-consumo');
    const barraAgua = document.getElementById('barra-agua');
    const luzVerde = document.getElementById('verde');
    const luzRoja = document.getElementById('roja');
    const estadoActual = document.getElementById('estado-actual');
    const mensajeEstado = document.getElementById('mensaje-estado');
    const cronometroLlenado = document.getElementById('cronometro-llenado');
    const ctx = document.getElementById('grafica-consumo').getContext('2d');

    let datosPulsos = [];
    let flujoActivo = false;
    let flujoCongelado = false;
    let tiempoFlujo = 0;
    let timerFlujo = null;
    let timerConsulta = null;
    let cerosConsecutivos = 0;
    let ultimosDatos = [];
    const minutosMax = 5;
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

    function startTimer() {
        if (!timerFlujo) {
            tiempoFlujo = 0;
            timerFlujo = setInterval(() => {
                tiempoFlujo++;
                const minutos = Math.floor(tiempoFlujo / 60);
                const segundos = tiempoFlujo % 60;
                cronometroLlenado.innerText = `Tiempo de llenado: ${minutos} min ${segundos} s`;
            }, 1000);
        }
    }

    function stopTimer() {
        if (timerFlujo) {
            clearInterval(timerFlujo);
            timerFlujo = null;
        }
    }

    function resetTimer() {
        tiempoFlujo = 0;
        cronometroLlenado.innerText = '';
    }

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

    function getHoraMexico() {
        const opciones = { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        return new Date().toLocaleString('es-MX', opciones);
    }

    function actualizarDesdeServidor() {
        fetch('/ultimos_datos')
            .then(response => response.json())
            .then(data => {
                if (data.lecturas) {
                    const nuevasLecturas = data.lecturas;

                    if (flujoCongelado) {
                        if (nuevasLecturas.some(v => v !== 0)) {
                            reiniciarTodo(true);
                        }
                        return;
                    }

                    if (nuevasLecturas.every(v => v === 0)) {
                        cerosConsecutivos++;
                        if (cerosConsecutivos >= 9) {
                            congelarFlujo();
                        }
                        return;
                    }

                    if (JSON.stringify(nuevasLecturas) !== JSON.stringify(ultimosDatos)) {
                        ultimosDatos = nuevasLecturas;
                        cerosConsecutivos = 0;

                        if (!flujoActivo) {
                            flujoActivo = true;
                            startTimer();
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

    function congelarFlujo() {
        flujoCongelado = true;
        flujoActivo = false;
        stopTimer();

        const litrosTotales = datosPulsos.reduce((a, b) => a + b, 0) * 0.0017;
        const horaDetencion = getHoraMexico();
        const minutos = Math.floor(tiempoFlujo / 60);
        const segundos = tiempoFlujo % 60;

        mensajeEstado.innerText = `Flujo detenido a las ${horaDetencion}. Duración: ${minutos} min ${segundos} s`;

        // Enviar suma de litros
        fetch('/guardar_datos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ consumo: litrosTotales })
        })
        .then(res => res.json())
        .then(data => console.log('Datos enviados:', data))
        .catch(err => console.error('Error al enviar:', err));
    }

    function reiniciarTodo(mostrarMensajeInicio) {
        flujoActivo = true;
        flujoCongelado = false;
        datosPulsos = [];
        ultimosDatos = [];
        cerosConsecutivos = 0;
        resetTimer();
        mensajeEstado.innerText = mostrarMensajeInicio ? "Nuevo flujo detectado." : "";
        inputConsumo.value = '0.00';
        actualizarGrafica();
        startTimer();
    }

    timerConsulta = setInterval(actualizarDesdeServidor, 5000);
});
