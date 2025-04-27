let RegistroL = [];
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
    RegistroL = [];
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
    body.style.backgroundColor = "#e0f7fa";

    graficaConsumo.data.labels = [];
    graficaConsumo.data.datasets[0].data = [];
    graficaConsumo.update();
}

function congelarSistema() {
    stopTimer();
    flujoCongelado = true;
    congelado = true;
    body.style.backgroundColor = "#cccccc"; // Fondo gris
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

        // ✅ Cuando llega el 0, calcular y mandar a la BD
        calcularYEnviarRegistroL();
    } else if (ultimoValor > 0) {
        if (congelado) reiniciarFlujo();
        if (!flujoActivo) {
            flujoActivo = true;
            startTimer();
        }
        RegistroL.push(ultimoValor); // ✅ Agregar cada valor recibido mayor a 0
    }

    tiempoInactivo = 0;

    const litros = RegistroL.reduce((a, b) => a + b, 0) * 0.0025;
    inputConsumo.value = litros.toFixed(2);

    const tiempoAcumuladoSeg = RegistroL.length * 1.25;
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

    graficaConsumo.data.labels = RegistroL.map((_, i) => (i * 1.25).toFixed(1));
    graficaConsumo.data.datasets[0].data = RegistroL;
    graficaConsumo.update();
}

function calcularYEnviarRegistroL() {
    if (RegistroL.length === 0) return;

    const sumaTotal = RegistroL.reduce((a, b) => a + b, 0);
    const consumo = sumaTotal * 0.017; // ✅ Multiplicación por 0.017 exacta como pediste

    fetch('/guardar_datos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consumo: consumo.toFixed(2) })
    })
    .then(res => res.json())
    .then(resp => {
        console.log('Consumo registrado en BD:', consumo.toFixed(2));
        mensajeEstado.innerText = `Consumo registrado: ${consumo.toFixed(2)} litros`;
    })
    .catch(err => console.error('Error al guardar consumo:', err));

    datoYaGuardado = true;
    RegistroL = []; // ✅ Limpiar para siguiente flujo
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
    setInterval(obtenerDatos, 100); // Cada 100 ms
});
