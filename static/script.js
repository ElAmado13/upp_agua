// script.js modificado para actualizar simulación de tubería en tiempo real
// y cambiar el color de la barra según duración del flujo basado en pulsos acumulados

let datosPulsos = [];
let flujoActivo = false;
let flujoCongelado = false;
let tiempoFlujo = 0;
let timerFlujo = null;
let tiempoInactivo = 0;
let cronometroLlenado = document.getElementById('cronometro-llenado');
let inputConsumo = document.getElementById('input-consumo');
let barraAgua = document.getElementById('barra-agua');
let mensajeEstado = document.getElementById('mensaje-estado');
let ctx = document.getElementById('grafica-consumo').getContext('2d');

let graficaConsumo = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Pulsos',
            data: [],
            borderColor: 'blue',
            backgroundColor: 'transparent',
            borderWidth: 2,
            fill: false
        }]
    },
    options: {
        responsive: true,
        scales: {
            x: {
                title: { display: true, text: 'Tiempo (s)' }
            },
            y: {
                title: { display: true, text: 'Pulsos' },
                beginAtZero: true
            }
        }
    }
});

function startTimer() {
    if (!timerFlujo) {
        tiempoFlujo = 0;
        timerFlujo = setInterval(() => {
            tiempoFlujo++;
            tiempoInactivo++;
            let min = Math.floor(tiempoFlujo / 60);
            let sec = tiempoFlujo % 60;
            cronometroLlenado.innerText = `Tiempo: ${min} min ${sec} s`;

            if (tiempoInactivo >= 20) {
                enviarResultadoFinal();
            }
        }, 1000);
    }
}

function stopTimer() {
    if (timerFlujo) {
        clearInterval(timerFlujo);
        timerFlujo = null;
    }
}

function reiniciarFlujo() {
    datosPulsos = [];
    tiempoInactivo = 0;
    flujoCongelado = false;
    flujoActivo = true;
    mensajeEstado.innerText = "Nuevo flujo detectado";
    inputConsumo.value = "0.00";
    barraAgua.style.width = "0%";
    barraAgua.style.backgroundColor = "#4da6ff";
    barraAgua.classList.remove("desbordando");
    graficaConsumo.data.labels = [];
    graficaConsumo.data.datasets[0].data = [];
    graficaConsumo.update();
    startTimer();
}

function actualizarGrafica(nuevosDatos) {
    if (!nuevosDatos || nuevosDatos.length === 0) return;

    const nuevos = nuevosDatos.filter(v => v > 0);
    if (nuevos.length === 0) return;

    if (!flujoActivo) reiniciarFlujo();

    datosPulsos = datosPulsos.concat(nuevos);
    tiempoInactivo = 0;

    const litros = datosPulsos.reduce((a, b) => a + b, 0) * 0.0025;
    inputConsumo.value = litros.toFixed(2);

    const tiempoAcumulado = datosPulsos.length * 0.256; // segundos
    const porcentaje = Math.min(100, (tiempoAcumulado / 300) * 100); // con base a 5 min (300s)
    barraAgua.style.width = `${porcentaje}%`;

    // Color dinámico de la barra
    if (tiempoAcumulado >= 300) {
        barraAgua.style.backgroundColor = "red";
        barraAgua.classList.add("desbordando");
    } else if (tiempoAcumulado >= 240) {
        barraAgua.style.backgroundColor = "orange";
        barraAgua.classList.remove("desbordando");
    } else {
        barraAgua.style.backgroundColor = "#4da6ff";
        barraAgua.classList.remove("desbordando");
    }

    graficaConsumo.data.labels = datosPulsos.map((_, i) => (i * 0.256).toFixed(1));
    graficaConsumo.data.datasets[0].data = datosPulsos;
    graficaConsumo.update();
}

function enviarResultadoFinal() {
    stopTimer();
    flujoActivo = false;
    flujoCongelado = true;
    mensajeEstado.innerText = "Flujo detenido. Enviando...";

    const totalLitros = datosPulsos.reduce((a, b) => a + b, 0) * 0.0025;
    fetch('/guardar_datos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consumo: totalLitros.toFixed(2) })
    })
    .then(res => res.json())
    .then(resp => {
        mensajeEstado.innerText = "Datos enviados. Esperando nuevo flujo...";
    })
    .catch(err => console.error('Error al enviar:', err));
}

function obtenerDatos() {
    fetch('/ultimos_datos')
        .then(res => res.json())
        .then(data => {
            if (data.lecturas && data.lecturas.length > 0) {
                actualizarGrafica(data.lecturas);
            }
        })
        .catch(err => console.error('Error al obtener datos:', err));
}

document.addEventListener('DOMContentLoaded', function () {
    setInterval(obtenerDatos, 1000);
});
