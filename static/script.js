// script.js final funcional para simulación y registro en tiempo real

let datosPulsos = [];
let flujoActivo = false;
let flujoCongelado = false;
let tiempoFlujo = 0;
let timerFlujo = null;
let tiempoInactivo = 0;
let datoYaGuardado = false;

const cronometroLlenado = document.getElementById('cronometro-llenado');
const inputConsumo = document.getElementById('input-consumo');
const barraAgua = document.getElementById('barra-agua');
const mensajeEstado = document.getElementById('mensaje-estado');
const ctx = document.getElementById('grafica-consumo').getContext('2d');

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

            if (tiempoInactivo >= 30 && !datoYaGuardado) {
                enviarResultadoFinal();
                datoYaGuardado = true;
            }
        }, 1000);
    }
}

function stopTimer() {
    clearInterval(timerFlujo);
    timerFlujo = null;
}

function reiniciarFlujo() {
    datosPulsos = [];
    tiempoInactivo = 0;
    tiempoFlujo = 0;
    flujoCongelado = false;
    flujoActivo = false;
    datoYaGuardado = false;

    mensajeEstado.innerText = "...";
    inputConsumo.value = "0.00";
    barraAgua.style.width = "0%";
    barraAgua.style.backgroundColor = "#4da6ff";
    barraAgua.classList.remove("desbordando");

    document.getElementById('verde').style.display = "none";
    document.getElementById('roja').style.display = "none";

    graficaConsumo.data.labels = [];
    graficaConsumo.data.datasets[0].data = [];
    graficaConsumo.update();
}


function actualizarGrafica(nuevosDatos) {
    if (!nuevosDatos || nuevosDatos.length === 0) return;
    const nuevos = nuevosDatos.filter(v => v > 0);
    if (nuevos.length === 0) return;

    if (flujoCongelado) reiniciarFlujo();

    if (!flujoActivo) reiniciarFlujo();

    datosPulsos = datosPulsos.concat(nuevos);
    tiempoInactivo = 0;

    const litros = datosPulsos.reduce((a, b) => a + b, 0) * 1.25;
    inputConsumo.value = litros.toFixed(2);

    const tiempoAcumuladoSeg = datosPulsos.length * 1.25;
    const tiempoMin = tiempoAcumuladoSeg / 60;
    const porcentaje = Math.min(100, (tiempoMin / 5) * 100);
    barraAgua.style.width = `${porcentaje}%`;

    if (tiempoMin >= 5) {
        barraAgua.style.backgroundColor = "red";
        barraAgua.classList.add("desbordando");
    } else if (tiempoMin >= 4) {
        barraAgua.style.backgroundColor = "orange";
        barraAgua.classList.remove("desbordando");
    } else {
        barraAgua.style.backgroundColor = "#4da6ff";
        barraAgua.classList.remove("desbordando");
    }

    graficaConsumo.data.labels = datosPulsos.map((_, i) => (i * 1.25).toFixed(1));
    graficaConsumo.data.datasets[0].data = datosPulsos;
    graficaConsumo.update();
}

function enviarResultadoFinal() {
    stopTimer();
    flujoActivo = false;
    flujoCongelado = true;
    mensajeEstado.innerText = "Flujo detenido. Enviando...";

    const totalLitros = datosPulsos.reduce((a, b) => a + b, 0) * 0.0025;
    if (totalLitros <= 0) {
        resetearBuffer();
        reiniciarFlujo();
        return;
    }

    fetch('/guardar_datos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consumo: totalLitros.toFixed(2) })
    })
    .then(res => res.json())
    .then(resp => {
        mensajeEstado.innerText = "Datos enviados. Esperando nuevo flujo...";
        resetearBuffer();
        reiniciarFlujo();
    })
    .catch(err => {
        console.error('Error al enviar:', err);
        resetearBuffer();
        reiniciarFlujo();
    });
}

function resetearBuffer() {
    fetch('/resetear_buffer', {
        method: 'POST'
    })
    .then(res => res.json())
    .then(data => {
        console.log('Buffer reseteado:', data.mensaje);
    })
    .catch(err => console.error('Error al resetear buffer:', err));
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
    setInterval(obtenerDatos, 100);
});
