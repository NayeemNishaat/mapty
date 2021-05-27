'use strict';
// console.log(nam);
// const n = 45;

// Segment: Structured Code

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const button = document.querySelector(`.form__btn`);

class Workout {
	date = new Date();
	#clicks = 0;
	id = (Date.now() + ``).slice(-10); // Remark: Bad idea!

	constructor(coords, distance, duration) {
		// Important: Constructor always runs with it's own empty object!
		this.coords = coords; // [lat, lng]
		this.distance = distance; // in kM
		this.duration = duration; // in min
		// this._setDescription(); // Remark: Can not do here because this --> {empty object} and this object doesn't have any type property!
	}

	_setDescription() {
		// Key: Prettier won't format the line below (next line)!
		// prettier-ignore
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
		];

		this.description = `${this.type[0].toUpperCase()}${this.type.slice(
			1
		)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
	}

	click() {
		return this.#clicks++;
	}
}

class Running extends Workout {
	type = `running`;

	constructor(coords, distance, duration, cadence) {
		super(coords, distance, duration);
		this.cadence = cadence;
		this.calcPace();
		this._setDescription();
	}

	calcPace() {
		// min/kM
		this.pace = this.duration / this.distance;
		return this.pace;
	}
}

class Cycling extends Workout {
	type = `cycling`;

	constructor(coords, distance, duration, elevationGain) {
		super(coords, distance, duration);
		this.elevationGain = elevationGain;
		this.calcSpeed();
		this._setDescription();
	}

	calcSpeed() {
		// kM/h
		this.speed = this.distance / (this.duration / 60);
		return this.speed;
	}
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Running([39, -12], 27, 95, 523);

// Key: Application Architecture
class App {
	#map;
	#mapZoomLevel = 11;
	#mapEvent;
	#workouts = [];
	#layers = [];

	constructor() {
		// Get user's position
		this._getPosition(); // Remark: Initially this points to {empty object}.

		// Get data from local storage
		this._getLocalStorage();

		// Attach event handlers
		inputType.addEventListener(`change`, this._toggleElevationField);
		form.addEventListener(`submit`, this._newWorkout.bind(this));
		containerWorkouts.addEventListener(
			`click`,
			this._moveToPopup.bind(this)
		);
		button.addEventListener(`click`, this._hideForm);
	}

	_getPosition() {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				this._loadMap.bind(this),
				function () {
					alert(`Could not get your position!`);
				}
			);
		}
	}

	_loadMap(position) {
		const { latitude, longitude } = position.coords;
		const coords = [latitude, longitude];

		this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

		L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
			maxZoom: 20,
			subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
		}).addTo(this.#map);

		this.#map.on(`click`, this._showForm.bind(this));

		this.#workouts.forEach((work) => {
			this._renderWorkoutMarker(work);
		});
	}

	_showForm(mapE) {
		this.#mapEvent = mapE;
		form.classList.remove(`hidden`);
		inputDistance.focus();

		// Important: Not a good idea to attach addEventListener into another method! Instead we should always attach addEventListener into the constructor function so that the functions are ready and wait for the event as soon as the page loads!
		// inputType.addEventListener(`change`, this._toggleElevationField);
		// form.addEventListener(`submit`, this._newWorkout.bind(this));
	}

	_hideForm() {
		// Key: Empty inputs
		inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = ``;
		// inputDistance.blur();

		form.style.display = `none`;
		form.classList.add(`hidden`);
		setTimeout(() => (form.style.display = `grid`), 1000);
	}

	_toggleElevationField() {
		inputElevation
			.closest(`.form__row`)
			.classList.toggle(`form__row--hidden`);
		inputCadence
			.closest(`.form__row`)
			.classList.toggle(`form__row--hidden`);
	}

	_newWorkout(e) {
		// Key: Helper function
		const validInputs = (...inputs) =>
			inputs.every((inp) => Number.isFinite(inp));

		const allPositive = (...inputs) => inputs.every((inp) => inp >= 0);

		e.preventDefault();

		//Get data from the form
		const type = inputType.value;
		const distance = +(inputDistance.value || undefined);
		const duration = +(inputDuration.value || undefined);
		const { lat, lng } = this.#mapEvent.latlng;
		let workout;

		//If workout running, create running object
		if (type === `running`) {
			const cadence = +(inputCadence.value || undefined);

			// Check if data is valid
			if (
				// !Number.isFinite(distance) ||
				// !Number.isFinite(duration) ||
				// !Number.isFinite(cadence)
				!validInputs(distance, duration, cadence) ||
				!allPositive(distance, duration, cadence)
			)
				return alert(
					`Inputs need to be positive numbers and can not be empty!`
				);

			workout = new Running([lat, lng], distance, duration, cadence);
		}

		//If workout cycling, create cycling object
		if (type === `cycling`) {
			const elevation = +inputElevation.value;

			// Check if data is valid
			if (
				!validInputs(distance, duration, elevation) ||
				!allPositive(distance, duration)
			)
				return alert(
					`Inputs need to be positive numbers and can not be empty!`
				);
			workout = new Cycling([lat, lng], distance, duration, elevation);
		}

		// Add the new object to workout array
		this.#workouts.push(workout);

		// Render workout on map as a marker
		this._renderWorkoutMarker(workout);

		// Render workout on list
		this._renderWorkout(workout);

		// Hide form & clear input fields
		this._hideForm();

		// Set local storage to all workouts
		this._setLocalStorage();
	}

	_renderWorkoutMarker(workout) {
		const layer = L.marker(workout.coords)
			.addTo(this.#map)
			.bindPopup(
				L.popup({
					maxWidth: 250,
					minWidth: 100,
					autoClose: false,
					closeOnClick: false,
					className: `${workout.type}-popup`
				})
			)
			.setPopupContent(
				`${workout.type === `running` ? `🏃‍♂️` : `🚴‍♀️`} ${
					workout.description
				}`
			)
			.openPopup();

		this.#layers.push(layer);
	}

	_renderWorkout(workout) {
		let html = `
		<li class="workout workout--${workout.type}" data-id="${workout.id}" >
			<h2 class="workout__title">${workout.description}</h2>
			<div class="workout__details">
			<span class="workout__icon"></span>
			<button  class="workout__value b e">Edit</button>
			<span class="workout__unit"></span>
			</div>
			<div class="workout__details">
			<span class="workout__icon"></span>
			<button class="workout__value b d">Delete</button>
			<span class="workout__unit"></span>
			</div>
			<div class="workout__details">
				<span class="workout__icon">${workout.type === `running` ? `🏃‍♂️` : `🚴‍♀️`}</span>
				<span class="workout__value">${workout.distance}</span>
				<span class="workout__unit">km</span>
			</div>
			<div class="workout__details">
				<span class="workout__icon">⏱</span>
				<span class="workout__value">${workout.duration}</span>
				<span class="workout__unit">min</span>
			</div>
		`;

		if (workout.type === `running`)
			html += `
			<div class="workout__details">
				<span class="workout__icon">⚡️</span>
				<span class="workout__value">${workout.pace?.toFixed(1) ?? 0}</span>
				<span class="workout__unit">min/km</span>
			</div>
			<div class="workout__details">
				<span class="workout__icon">🦶🏼</span>
				<span class="workout__value">${workout.cadence}</span>
				<span class="workout__unit">spm</span>
			</div>
        </li>
		`;

		if (workout.type === `cycling`)
			html += `
			<div class="workout__details">
            	<span class="workout__icon">⚡️</span>
            	<span class="workout__value">${
					workout.speed?.toFixed(1) ?? 0
				}</span>
            	<span class="workout__unit">km/h</span>
          	</div>
          	<div class="workout__details">
            	<span class="workout__icon">⛰</span>
            	<span class="workout__value">${workout.elevationGain}</span>
            	<span class="workout__unit">m</span>
          	</div>
        </li>
		`;

		containerWorkouts.insertAdjacentHTML(`beforeend`, html);
	}

	_moveToPopup(e) {
		const workoutEl = e.target.closest(`.workout`);
		const editEl = e.target.closest(`.e`);
		const delEl = e.target.closest(`.d`);

		if (editEl) {
			this._editEl(editEl);
		}
		if (delEl) {
			this._delEl(delEl);
		}

		if (!workoutEl || editEl || delEl) return;

		const workout = this.#workouts.find(
			(work) => work.id === workoutEl.dataset.id
		);

		this.#map.setView(workout.coords, this.#mapZoomLevel, {
			animate: true,
			pan: {
				duration: 1
			}
		});

		// Using the public interface
		// console.log(workout.click());
	}

	_setLocalStorage() {
		localStorage.setItem(`workouts`, JSON.stringify(this.#workouts)); // Remark: Only advised to use for small amount of data! Because it's b;ocking and slows the application.
	}

	_getLocalStorage() {
		const data = JSON.parse(localStorage.getItem(`workouts`)); // Important: This technique has a huge problem. When we store something in the local storage as JSON.stringify() it only stores the objects/Arrays but not their prototypes. Hence we won't be able to inherit any methods/properties from the parent class and use them. Point: Solution is we need to create the objects manually by ourself from the data obtained from local storage to restore the objects and their ptototype chain in order to inherit from parent class!

		if (!data) return;

		this.#workouts = data;

		this.#workouts.forEach((work) => {
			this._renderWorkout(work);
			// this._renderWorkoutMarker(work); // Remark: It doesn't work because it takes some time to load/render the map. Henec, when this method is called the map still does't exist (Asynchronous behaviour). Point: The solution to this is call this method only when the map is loaded.
		});
	}

	_editEl(editEl) {
		const [lat, lng] = this._findDelItem(editEl);
		this._showForm({
			latlng: {
				lat: lat,
				lng: lng
			}
		});

		this._delEl(editEl);
	}

	_findDelItem(el) {
		const wo = this.#workouts.find(
			(work) => work.id === el.closest(`.workout`).dataset.id
		);
		return wo.coords;
	}

	_delEl(delEl) {
		// Finding the index of the item to be deleted
		const workout = this.#workouts.findIndex(
			(work) => work.id === delEl.closest(`.workout`).dataset.id
		);

		// Finding the item to be deleted
		const [wlat, wlng] = this._findDelItem(delEl);

		// Removing item from the array
		this.#workouts.splice(workout, 1);

		// Removing element from DOM
		delEl.closest(`.workout`).remove();
		// Removing from local storage
		localStorage.setItem(`workouts`, JSON.stringify(this.#workouts));

		// Removing from map
		const layer = this.#layers.find((lyr) => {
			const { lat, lng } = lyr.getLatLng();
			return lat === wlat && lng === wlng;
		});
		this.#map.removeLayer(layer);
	}

	reset() {
		localStorage.removeItem(`workouts`);
		location.reload();
	}
}

const app = new App();

// Segment: Spaghetti Code
/* if (navigator.geolocation) {
	navigator.geolocation.getCurrentPosition(
		function (position) {
			// Key: Success Callback
			// const latitude = position.coords.latitude;
			// const longitude = position.coords.longitude;
			// point: Use destructuring for better dry code.
			const { latitude, longitude } = position.coords;
			// console.log(
			// 	`https://www.google.com/maps/@${latitude},${longitude},16z`
			// );
			const coords = [latitude, longitude];

			// Point: L is a global variable.
			map = L.map('map').setView(coords, 11); // Remark: Here L is the namespace of Liflet library just like Intl in the internationalization API. L is the kind of main function that gives us basically an entry point into the leaflet library!
			// console.log(map);

			// Key: Themes for the map style
			//https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png
			//https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
			L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
				maxZoom: 20,
				subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
			}).addTo(map); // In lyrs, m --> street, p --> terrain, s --> satellite, s,h --> hybrid

			// L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			// 	attribution:
			// 		'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
			// }).addTo(map);

			// Key: Handeling clicks on map
			map.on(`click`, function (mapE) {
				mapEvent = mapE;
				form.classList.remove(`hidden`);
				inputDistance.focus();
			}); // remark: map object is generated by the leaflet library and this on method is coming from the leaflet not from JS!
		},
		function () {
			// Key: Failure Callback
			alert(`Could not get you position!`);
		}
	);
}

form.addEventListener(`submit`, function (e) {
	e.preventDefault();

	// Key: Clear input fields
	inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = ``;

	// Display marker
	const { lat, lng } = mapEvent.latlng;
	L.marker([lat, lng])
		.addTo(map)
		.bindPopup(
			L.popup({
				maxWidth: 250,
				minWidth: 100,
				autoClose: false,
				closeOnClick: false,
				className: `running-popup`
			})
		)
		.setPopupContent(`Workout`)
		.openPopup();
});

inputType.addEventListener(`change`, function () {
	inputElevation.closest(`.form__row`).classList.toggle(`form__row--hidden`);
	inputCadence.closest(`.form__row`).classList.toggle(`form__row--hidden`);
}); */
