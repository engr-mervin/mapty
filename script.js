'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

let map;

// const success = function (pos) {
//   const { latitude } = pos.coords;
//   const { longitude } = pos.coords;
//   console.log(`https://www.google.com/maps/@${latitude},${longitude},15z`);

// const coords = [latitude, longitude];

// map = L.map('map').setView(coords, 14);
// console.log(map);

//   L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
//     attribution:
//       '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
//   }).addTo(map);

//   map.on('click', function (mapEvent) {
//     form.classList.remove('hidden');
//     mapEventReal = mapEvent;
//     inputDistance.focus();
//   });
// };
/////////////////////////////////////////////////////////////////

class Workout {
  clicks = 0;
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;

    // console.log(this.description);
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.calcPace();
    this._setDescription();
    this.cadence = cadence;
  }

  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    //km/min
    this.speed = (this.distance * 60) / this.duration;
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);

///////////////////////////////////////////////////////////////////////////////////////////
class App {
  #map;
  origin;
  #mapEventReal;
  #workouts = [];
  #zoom = 14;

  constructor() {
    this._getPosition();
    this._initEvents();

    //get data from local storage
    this._getLocalStorage();
  }

  _loadWorkout(workoutObjects) {
    workoutObjects.forEach(w => {
      let newWo;
      if (w.type === 'running') {
        newWo = new Running(w.coords, w.distance, w.duration, w.cadence);
      } else {
        newWo = new Cycling(w.coords, w.distance, w.duration, w.elevationGain);
      }
      newWo.id = w.id;
      newWo.clicks = w.clicks;
      this.#workouts.push(newWo);
      console.log(this.#workouts);
    });

    this.#workouts.forEach(w => {
      this._renderWorkoutList(w);
    });
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('Could not get your position');
      }
    );
  }

  _initEvents() {
    //map click

    //change input type
    inputType.addEventListener('change', this._toggleElevationField);
    //submit form
    form.addEventListener('submit', this._newWorkout.bind(this));
    //move to marker click workout
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);

    if (!data) return;

    this._loadWorkout(data);
  }

  _loadMap(pos) {
    const { latitude } = pos.coords;
    const { longitude } = pos.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude},15z`);
    this.origin = [latitude, longitude];

    this.#map = L.map('map').setView(this.origin, this.#zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(w => {
      this._renderWorkoutMarker(w);
    });
  }

  _showForm(mapEvent) {
    form.classList.remove('hidden');
    this.#mapEventReal = mapEvent;
    inputDistance.focus();
  }

  _hideForm() {
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
    inputCadence.value = '';
    inputDistance.value = '';
    inputDuration.value = '';
    inputElevation.value = '';
  }
  _toggleElevationField(e) {
    e.preventDefault();
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    //Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    const newCoor = [
      this.#mapEventReal.latlng.lat,
      this.#mapEventReal.latlng.lng,
    ];
    let workout;

    //Check if data is valid

    //if running, crete running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validInput(distance, duration, cadence) &&
        !allPositive(distance, duration, cadence)
      ) {
        return alert('The input should be a positive number');
      }

      workout = new Running(newCoor, distance, duration, cadence);
    }
    //if cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInput(distance, duration, elevation) &&
        !allPositive(distance, duration)
      ) {
        return alert('The input should be a positive number');
      }
      workout = new Cycling(newCoor, distance, duration, elevation);
    }

    this.#workouts.push(workout);
    console.log(workout);
    console.log(this.#workouts);
    //add new object to workout array

    //render workout on map as a marker
    this._renderWorkoutMarker(workout);
    //render workout on list
    this._renderWorkoutList(workout);
    //hide form + clear input fields
    this._hideForm();

    //set local storage of all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        String(
          `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}${workout.description}`
        ),
        {
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        }
      )
      .openPopup();
  }

  _renderWorkoutList(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>`;
    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${
          Math.round(workout.pace * 100) / 100
        }</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
      </li>`;
    }

    if (workout.type === 'cycling') {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(2)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
      </li>`;
    }
    // console.log(html);
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (workoutEl === null) return;
    console.log(workoutEl);
    const currWorkout = this.#workouts.find(
      el => el.id === workoutEl.dataset.id
    );
    console.log(currWorkout);
    this.#map.setView(currWorkout.coords, this.#zoom, {
      animate: true,
      pan: { duration: 1 },
    });
    currWorkout.click();
    // L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    //   attribution:
    //     '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    // }).addTo(this.#map);
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
