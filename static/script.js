let datosPulsos = [];
let flujoActivo = false;
let flujoCongelado = false;
let tiempoFlujo = 0;
let timerFlujo = null;
let tiempoInactivo = 0;
let datoYaGuardado = false;
let congelado = false;

const cronometroLlenado = document.getElementById('cronometro-llenado');
const inputConsumo = document.getElementById('input-consumo');
const barraAgua = document.getElementById('barra-agua');
const mensajeEstado = document.getElementById('mensaje-estado');
const body = document.body;

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
            x: { title: { display: true, text: 'Tiempo (s)' } },
            y: { title: { display: true, text: 'Pulsos' }, beginAtZero: true }
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

            // Si pasan 30 segundos sin nuevos datos después de un 0, congelar
            if (tiempoInactivo >= 30 && !datoYaGuardado) {
                enviarResultadoFinal();
                congelarSistema();
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
    congelado = false;

    mensajeEstado.innerText = "Esperando datos...";
    inputConsumo.value = "0.00";
    barraAgua.style.width = "0%";
    barraAgua.style.backgroundColor = "#4da6ff";
    barraAgua.classList.remove("desbordando");
    body.style.backgroundColor = "#e0f7fa"; // color normal

    graficaConsumo.data.labels = [];
    graficaConsumo.data.datasets[0].data = [];
    graficaConsumo.update();
}

function congelarSistema() {
    stopTimer();
    flujoCongelado = true;
    congelado = true;
    body.style.backgroundColor = "#cccccc"; // Cambiar fondo a gris
    mensajeEstado.innerText = "Sistema en espera. Sin datos nuevos.";
}

function actualizarGrafica(nuevosDatos) {
    if (!nuevosDatos || nuevosDatos.length === 0) return;
    
    const nuevos = nuevosDatos.filter(v => v >= 0);
    if (nuevos.length === 0) return;

    const ultimoValor = nuevos[nuevos.length - 1];

    if (ultimoValor === 0 && flujoActivo) {
        flujoActivo = false;
        tiempoInactivo = 0; // empezar a contar inactividad
    } else if (ultimoValor > 0) {
        if (congelado) reiniciarFlujo();
        if (!flujoActivo) reiniciarFlujo();
        flujoActivo = true;
        flujoCongelado = false;
    }

    datosPulsos = nuevos;
    tiempoInactivo = 0;

    const litros = datosPulsos.reduce((a, b) => a + b, 0) * 0.0025;
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
    datoYaGuardado = true;

    const totalLitros = datosPulsos.reduce((a, b) => a + b, 0) * 0.0017; // Cambio a 0.0017
    if (totalLitros <= 0) return;

    fetch('/guardar_datos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consumo: totalLitros.toFixed(2) })
    })
    .then(res => res.json())
    .then(resp => {
        console.log('Datos guardados automáticamente:', resp);
    })
    .catch(err => console.error('Error al guardar datos:', err));
}

function obtenerDatos() {
    fetch('/ultimos_datos')
        .then(res => res.json())
        .then(data => {
            if (data.lecturas) {
                actualizarGrafica(data.lecturas);
            }
        })
        .catch(err => console.error('Error al obtener datos:', err));
}

document.addEventListener('DOMContentLoaded', function () {
    setInterval(obtenerDatos, 100); // 100 ms
});
