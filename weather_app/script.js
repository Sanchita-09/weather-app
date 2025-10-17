/* ======================
   Configuration
   ====================== */
const apiKey = "YOUR_API_KEY_HERE"; // <-- Replace with your OpenWeatherMap API key

/* ======================
   DOM refs
   ====================== */
const app = document.getElementById("app");
const message = document.getElementById("message");
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const refreshBtn = document.getElementById("refreshBtn");

const locationEl = document.getElementById("location");
const localTimeEl = document.getElementById("localTime");
const temperatureEl = document.getElementById("temperature");
const conditionEl = document.getElementById("condition");
const weatherIconEl = document.getElementById("weatherIcon");
const feelsEl = document.getElementById("feels");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const tempMinEl = document.getElementById("tempMin");
const tempMaxEl = document.getElementById("tempMax");
const sunriseEl = document.getElementById("sunrise");
const sunsetEl = document.getElementById("sunset");
const coordsEl = document.getElementById("coords");
const forecastCards = document.getElementById("forecastCards");

// ☀️ NEW DOM Reference
const sunIconContainer = document.getElementById("sunIconContainer");
// 📊 NEW DOM Reference
const hourlyForecastContainer = document.querySelector(".hourly-cards-container");

/* ======================
   Helpers
   ====================== */
function showMessage(text) {
message.style.display = "block";
message.innerHTML = `<small>${text}</small>`;
}
function hideMessage() {
message.style.display = "none";
}

function setBackgroundForWeather(main) {
const map = {
Clear: "images/clear.jpg",
Clouds: "images/clouds.jpg",
Rain: "images/rain.jpg",
Drizzle: "images/drizzle.jpg",
Thunderstorm: "images/thunderstorm.jpg",
Snow: "images/snow.jpg",
Mist: "images/mist.jpg",
Haze: "images/haze.jpg",
Fog: "images/mist.jpg",
Smoke: "images/haze.jpg",
};

const imagePath = map[main] || "images/default.jpg";
app.style.backgroundImage = `url("${imagePath}")`;
}

function formatTimeFromUnix(ts, timezoneOffsetSeconds) {
// ts in seconds; timezone offset in seconds
const local = (ts + timezoneOffsetSeconds) * 1000;
const d = new Date(local);
return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDateTimeFromUnix(ts, timezoneOffsetSeconds) {
const local = (ts + timezoneOffsetSeconds) * 1000;
const d = new Date(local);
return d.toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });
}
// Helper for hourly forecast time
function formatHourFromUnix(ts, timezoneOffsetSeconds) {
    const local = (ts + timezoneOffsetSeconds) * 1000;
    const d = new Date(local);
    return d.toLocaleTimeString([], { hour: "2-digit" });
}

function degToCompass(num) {
const val = Math.floor((num / 22.5) + 0.5);
const arr = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
 return arr[(val % 16)];
}

/**
 * Renders a simple SVG icon showing the sun's path for sunrise/sunset times.
 * This is for visualization only and doesn't reflect the current solar angle.
 */
function renderSunPathIcon(sunriseTs, sunsetTs) {
    sunIconContainer.innerHTML = ""; // Clear existing content
    
    // SVG dimensions
    const width = 150;
    const height = 50;
    const padding = 5;
    const barHeight = height - padding;
    
    // Create the SVG element
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");

    // Draw the main arc path (sun's trajectory)
    const arcPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    arcPath.setAttribute("d", `M ${padding} ${barHeight} A ${width/2 - padding} ${barHeight} 0 0 1 ${width - padding} ${barHeight}`);
    arcPath.setAttribute("fill", "none");
    arcPath.setAttribute("stroke", "rgba(255, 255, 255, 0.5)");
    arcPath.setAttribute("stroke-width", "2");
    
    // Draw the horizon line
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", padding);
    line.setAttribute("y1", barHeight);
    line.setAttribute("x2", width - padding);
    line.setAttribute("y2", barHeight);
    line.setAttribute("stroke", "rgba(255, 255, 255, 0.8)");
    line.setAttribute("stroke-width", "1");
    
    // Draw the Sunrise dot
    const sunDotRise = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    sunDotRise.setAttribute("cx", padding);
    sunDotRise.setAttribute("cy", barHeight);
    sunDotRise.setAttribute("r", "3.5");
    sunDotRise.setAttribute("fill", "#FFD700");
    
    // Draw the Sunset dot
    const sunDotSet = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    sunDotSet.setAttribute("cx", width - padding);
    sunDotSet.setAttribute("cy", barHeight);
    sunDotSet.setAttribute("r", "3.5");
    sunDotSet.setAttribute("fill", "#4682B4"); // SteelBlue for sunset
    
    svg.appendChild(arcPath);
    svg.appendChild(line);
    svg.appendChild(sunDotRise);
    svg.appendChild(sunDotSet);
    
    sunIconContainer.appendChild(svg);
}


/* ======================
   API calls
   ====================== */
async function fetchCurrentByCoords(lat, lon) {
const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
const res = await fetch(url);
if (!res.ok) {
throw new Error(`Weather API error (${res.status})`);
}
return res.json();
}

async function fetchForecastByCoords(lat, lon) {
const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
const res = await fetch(url);
if (!res.ok) throw new Error("Forecast API error");
return res.json();
}

async function fetchByCityName(city) {
const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
const res = await fetch(url);
if (!res.ok) {
const err = await res.json().catch(()=>({message:"Unknown"}));
throw new Error(err.message || "City not found");
}
return res.json();
}

/* ======================
   Renderers
   ====================== */
function renderCurrent(data) {
const tzOffset = data.timezone ?? 0; // seconds
locationEl.textContent = `${data.name}, ${data.sys?.country || ""}`;
localTimeEl.textContent = new Date((Date.now()/1000 + tzOffset) * 1000).toLocaleString([], { weekday:"short", hour:"2-digit", minute:"2-digit" });

temperatureEl.textContent = `${Math.round(data.main.temp)}°C`;
conditionEl.textContent = `${data.weather[0].main} • ${data.weather[0].description}`;
weatherIconEl.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
weatherIconEl.alt = data.weather[0].description;

feelsEl.textContent = `${Math.round(data.main.feels_like)}°C`;
humidityEl.textContent = `${data.main.humidity}%`;
windEl.textContent = `${Math.round(data.wind.speed)} m/s ${degToCompass(data.wind.deg || 0)}`;

tempMinEl.textContent = `${Math.round(data.main.temp_min)}°C`;
tempMaxEl.textContent = `${Math.round(data.main.temp_max)}°C`;

sunriseEl.textContent = formatTimeFromUnix(data.sys.sunrise, tzOffset);
sunsetEl.textContent = formatTimeFromUnix(data.sys.sunset, tzOffset);
coordsEl.textContent = `lat: ${data.coord.lat.toFixed(2)}, lon: ${data.coord.lon.toFixed(2)}`;

setBackgroundForWeather(data.weather[0].main);
  
  // ☀️ NEW: Render the Sun Path Icon
  renderSunPathIcon(data.sys.sunrise, data.sys.sunset);
}

function renderForecast(forecastData) {
// forecastData.list contains 3-hourly data for 5 days. Choose one item per day (prefer 12:00 local).
const tzOffset = forecastData.city.timezone || 0;
const list = forecastData.list;
const days = {};
list.forEach(item => {
const localTs = item.dt + tzOffset;
const d = new Date(localTs * 1000);
const day = d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

if (!days[day]) days[day] = [];
days[day].push(item);
});

// Keep only next 5 distinct days
const dayKeys = Object.keys(days).slice(0, 5);
forecastCards.innerHTML = "";

dayKeys.forEach(key => {
const items = days[key];
 // pick the item closest to 12:00
let target = items.reduce((best, cur) => {
const curHour = new Date((cur.dt + tzOffset) * 1000).getUTCHours();
const bestHour = new Date((best.dt + tzOffset) * 1000).getUTCHours();
return Math.abs(curHour - 12) < Math.abs(bestHour - 12) ? cur : best;
}, items[0]);

const el = document.createElement("div");
el.className = "day-card";
el.innerHTML = `
<div class="day-left">
<img class="small-icon" src="https://openweathermap.org/img/wn/${target.weather[0].icon}@2x.png" alt="${target.weather[0].description}" />
<div class="day-info">
<div class="day-name">${key}</div>
<div class="day-cond">${target.weather[0].main} • ${target.weather[0].description}</div>
</div>
</div>
<div class="day-temp">
${Math.round(target.main.temp)}°C
</div>
`;
forecastCards.appendChild(el);
});
  
  // 📊 NEW: Render 24-Hour Forecast
  renderHourlyForecast(list, tzOffset);
}

/**
 * Renders the 24-hour (first 8 x 3-hour entries) forecast.
 * @param {Array} list - The list property from the forecast API response.
 * @param {number} tzOffset - The timezone offset in seconds.
 */
function renderHourlyForecast(list, tzOffset) {
    hourlyForecastContainer.innerHTML = ""; // Clear existing content
    
    // We only want the next 8 entries (24 hours in 3-hour steps)
    const hourlyData = list.slice(0, 8);

    hourlyData.forEach(item => {
        const time = formatHourFromUnix(item.dt, tzOffset);
        const temp = Math.round(item.main.temp);
        const iconUrl = `https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`;
        const description = item.weather[0].description;
        
        const el = document.createElement("div");
        el.className = "hourly-card";
        el.innerHTML = `
            <div class="hourly-time">${time}</div>
            <img class="hourly-icon" src="${iconUrl}" alt="${description}" title="${description}" />
            <div class="hourly-temp">${temp}°C</div>
        `;
        hourlyForecastContainer.appendChild(el);
    });
    
    // Add a basic style for the small icon in the hourly card (since it wasn't in the original CSS)
    // We'll define a quick style block here to ensure the icon looks right.
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        .hourly-icon {
            width: 40px; 
            height: 40px;
            object-fit: contain;
        }
    `;
    if (!document.head.querySelector('style[data-hourly-styles]')) {
        styleEl.setAttribute('data-hourly-styles', 'true');
        document.head.appendChild(styleEl);
    }
}


/* ======================
   Main flows
   ====================== */
async function loadByCoords(lat, lon, showLoading = true) {
try {
if (showLoading) {
showMessage("Loading current location weather...");
app.classList.add("loading");
}

const [current, forecast] = await Promise.all([
fetchCurrentByCoords(lat, lon),
fetchForecastByCoords(lat, lon)
]);

renderCurrent(current);
renderForecast(forecast);
} catch (err) {
console.error(err);
showMessage("Unable to fetch weather. " + (err.message || ""));
} finally {
hideMessage();
app.classList.remove("loading");
}
}

async function loadByCity(city) {
try {
showMessage(`Searching for "${city}"...`);
app.classList.add("loading");
const current = await fetchByCityName(city);
const lat = current.coord.lat;
const lon = current.coord.lon;
const forecast = await fetchForecastByCoords(lat, lon);

renderCurrent(current);
renderForecast(forecast);
} catch (err) {
console.error(err);
showMessage("City not found or API error. " + (err.message || ""));
} finally {
setTimeout(() => {
hideMessage();
app.classList.remove("loading");
}, 900);
}
}

/* ======================
   Geolocation fallback
   ====================== */
function initDefaultLocationFallback() {
// Fallback city (will be used if geolocation denied)
const fallbackCity = "Mumbai";
loadByCity(fallbackCity);
}

/* ======================
   Events
   ====================== */
searchBtn.addEventListener("click", () => {
const q = cityInput.value.trim();
if (!q) {
showMessage("Type a city name to search.");
setTimeout(hideMessage, 1000);
return;
}
loadByCity(q);
});

cityInput.addEventListener("keydown", (e) => {
if (e.key === "Enter") searchBtn.click();
});

refreshBtn.addEventListener("click", () => {
// Re-fetch current location
requestGeolocation();
});

/* ======================
   Geolocation request
   ====================== */
function requestGeolocation() {
if (!("geolocation" in navigator)) {
initDefaultLocationFallback();
return;
}
showMessage("Getting your location...");
app.classList.add("loading");

const geoOptions = { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 };

navigator.geolocation.getCurrentPosition(
(pos) => {
const lat = pos.coords.latitude;
const lon = pos.coords.longitude;
loadByCoords(lat, lon);
},
(err) => {
console.warn("Geolocation failed:", err);
hideMessage();
app.classList.remove("loading");
initDefaultLocationFallback();
},
geoOptions
);
}

/* ======================
   Boot
   ====================== */
(function boot() {
if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
showMessage("Please add your OpenWeatherMap API key in script.js (replace YOUR_API_KEY_HERE).");
return;
}
requestGeolocation();
})();
