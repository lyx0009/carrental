// ===== Firebase Admin Class =====
class CarRentalAdmin {
    constructor() {
        this.currentUser = null;
        this.selectedCars = new Set();
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.setupEventListeners();
        await this.loadCars();
        await this.loadReservations();
    }

    async checkAuth() {
        return new Promise((resolve) => {
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    this.currentUser = user;
                    console.log('Admin authenticated:', user.email);
                    resolve(user);
                } else {
                    window.location.href = 'login.html';
                }
            });
        });
    }

    setupEventListeners() {
        // ===== Section Switching =====
        document.querySelectorAll(".sidebar li").forEach(li => {
            li.addEventListener("click", () => {
                if (li.dataset.section === "account-settings") {
                    window.location.href = "adminsettings.html";
                    return;
                }

                document.querySelectorAll(".sidebar li").forEach(i => i.classList.remove("active"));
                li.classList.add("active");

                const targetSec = document.getElementById(li.dataset.section);
                if(targetSec){
                    document.querySelectorAll(".section").forEach(sec => sec.classList.add("hidden"));
                    targetSec.classList.remove("hidden");
                }
            });
        });

        // ===== CAR MODAL =====
        const addCarModal = document.getElementById("addCarModal");
        document.getElementById("openAddCar").onclick = () => addCarModal.classList.add("show");
        document.getElementById("cancelAddCar").onclick = () => addCarModal.classList.remove("show");
        document.getElementById("closeAdd").onclick = () => addCarModal.classList.remove("show");

        // Image preview
        document.getElementById("carImage").addEventListener("change", e => {
            const preview = document.getElementById("imagePreview");
            const file = e.target.files[0];
            if(file){
                const reader = new FileReader();
                reader.onload = () => preview.innerHTML = `<img src="${reader.result}" />`;
                reader.readAsDataURL(file);
            }else{
                preview.innerText = "No image selected";
            }
        });

        // ===== ADD CAR =====
        document.getElementById("addCarForm").onsubmit = (e) => this.addCar(e);

        // ===== REMOVE SELECTED CARS =====
        document.getElementById("removeSelected").onclick = () => this.removeSelectedCars();

        // ===== SELECT ALL =====
        document.getElementById("selectAll").onclick = function(){
            document.querySelectorAll("#carTable tbody .row-select")
                .forEach(cb => {
                    cb.checked = this.checked;
                    if (this.checked) {
                        window.carRentalAdmin.selectedCars.add(cb.dataset.id);
                    } else {
                        window.carRentalAdmin.selectedCars.delete(cb.dataset.id);
                    }
                });
        };

        // ===== RESERVATION MODAL =====
        const reservationModal = document.getElementById("reservationModal");
        document.getElementById("openAddReservation").onclick = () => reservationModal.classList.add("show");
        document.getElementById("cancelReservation").onclick = () => reservationModal.classList.remove("show");
        document.getElementById("closeReservationModal").onclick = () => reservationModal.classList.remove("show");

        // ===== ADD RESERVATION =====
        document.getElementById("addReservationForm").onsubmit = (e) => this.addReservation(e);

        // ===== REMOVE RESERVATION =====
        document.addEventListener("click", e => {
            if(e.target.classList.contains("removeReservation")){
                const reservationId = e.target.dataset.id;
                if (reservationId) {
                    this.removeReservation(reservationId);
                }
            }
        });

        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });
    }

    // ===== IMAGE UPLOAD =====
    async uploadCarImage(file, carId) {
        try {
            const storageRef = firebase.storage().ref();
            const imageRef = storageRef.child(`car-images/${carId}/${Date.now()}_${file.name}`);
            const snapshot = await imageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();
            return downloadURL;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    // ===== ADD CAR TO FIRESTORE =====
    async addCar(e) {
        e.preventDefault();
        
        const carData = {
            name: document.getElementById("carModel").value,
            model: document.getElementById("carModel").value,
            type: document.getElementById("carType").value,
            plate: document.getElementById("carPlate").value,
            seater: parseInt(document.getElementById("carSeater").value),
            status: document.getElementById("carStatus").value,
            available: document.getElementById("carAvailability").value === "Yes",
            price: parseInt(document.getElementById("carPrice").value),
            transmission: "Automatic",
            description: `${document.getElementById("carModel").value} - A comfortable car for your travel needs.`,
            brand: document.getElementById("carType").value,
            imageUrls: [],
            mainImage: '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            const db = firebase.firestore();
            const carRef = await db.collection('cars').add(carData);
            const carId = carRef.id;

            // Upload image if provided
            const imageFile = document.getElementById("carImage").files[0];
            if (imageFile) {
                const imageUrl = await this.uploadCarImage(imageFile, carId);
                await db.collection('cars').doc(carId).update({
                    imageUrls: [imageUrl],
                    mainImage: imageUrl
                });
            }

            alert('Car added successfully!');
            document.getElementById("addCarModal").classList.remove("show");
            document.getElementById("addCarForm").reset();
            document.getElementById("imagePreview").innerText = "No image selected";
            await this.loadCars();
            
        } catch (error) {
            console.error('Error adding car:', error);
            alert('Error adding car: ' + error.message);
        }
    }

    // ===== LOAD CARS FROM FIRESTORE =====
    async loadCars() {
        try {
            const db = firebase.firestore();
            const snapshot = await db.collection('cars').orderBy('createdAt', 'desc').get();
            const tbody = document.querySelector('#carTable tbody');
            tbody.innerHTML = '';

            if (snapshot.empty) {
                console.log('No cars found in Firebase');
                // Load demo data or show empty state
                return;
            }

            snapshot.forEach(doc => {
                const car = doc.data();
                const row = this.createCarRow(doc.id, car);
                tbody.appendChild(row);
            });
            
            console.log(`Found ${snapshot.size} cars in Firebase`);
        } catch (error) {
            console.error('Error loading cars:', error);
            // Fallback to demo data
        }
    }

    createCarRow(id, car) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input class="row-select" type="checkbox" data-id="${id}"></td>
            <td>${id.substring(0, 8)}</td>
            <td>${car.name || car.model || 'No name'}</td>
            <td>${car.type || 'No type'}</td>
            <td>${car.plate || 'No plate'}</td>
            <td>${car.seater || 'N/A'}</td>
            <td>${car.status || 'Unknown'}</td>
            <td>${car.available ? 'Yes' : 'No'}</td>
            <td>₱${car.price || '0'}</td>
            <td>
                ${car.mainImage ? 
                    `<img class="thumb" src="${car.mainImage}" alt="${car.name}">` : 
                    '<img class="thumb" src="https://via.placeholder.com/140x90.png?text=Car">'
                }
            </td>
        `;

        const checkbox = row.querySelector('.row-select');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.selectedCars.add(id);
            } else {
                this.selectedCars.delete(id);
                document.getElementById('selectAll').checked = false;
            }
        });

        return row;
    }

    // ===== REMOVE SELECTED CARS FROM FIRESTORE =====
    async removeSelectedCars() {
        if (this.selectedCars.size === 0) {
            alert('Please select cars to remove');
            return;
        }

        if (!confirm(`Are you sure you want to remove ${this.selectedCars.size} car(s)?`)) {
            return;
        }

        try {
            const db = firebase.firestore();
            const deletePromises = Array.from(this.selectedCars).map(id => 
                db.collection('cars').doc(id).delete()
            );
            
            await Promise.all(deletePromises);
            this.selectedCars.clear();
            document.getElementById('selectAll').checked = false;
            await this.loadCars();
            alert('Cars removed successfully!');
        } catch (error) {
            console.error('Error removing cars:', error);
            alert('Error removing cars: ' + error.message);
        }
    }

    // ===== ADD RESERVATION TO FIRESTORE =====
    async addReservation(e) {
        e.preventDefault();

        const reservationData = {
            customerName: document.getElementById("customerName").value,
            contactNumber: document.getElementById("contactNumber").value,
            carModel: document.getElementById("reservationCar").value,
            startDate: document.getElementById("startDate").value,
            endDate: document.getElementById("endDate").value,
            status: document.getElementById("reservationStatus").value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            const db = firebase.firestore();
            await db.collection('reservations').add(reservationData);
            
            alert('Reservation added successfully!');
            document.getElementById("reservationModal").classList.remove("show");
            document.getElementById("addReservationForm").reset();
            await this.loadReservations();
            
        } catch (error) {
            console.error('Error adding reservation:', error);
            alert('Error adding reservation: ' + error.message);
        }
    }

    // ===== LOAD RESERVATIONS FROM FIRESTORE =====
    async loadReservations() {
        try {
            const db = firebase.firestore();
            const snapshot = await db.collection('reservations').orderBy('createdAt', 'desc').get();
            const tbody = document.querySelector('#reservationTable tbody');
            tbody.innerHTML = '';

            if (snapshot.empty) {
                console.log('No reservations found in Firebase');
                return;
            }

            snapshot.forEach(doc => {
                const reservation = doc.data();
                const row = this.createReservationRow(doc.id, reservation);
                tbody.appendChild(row);
            });
            
            console.log(`Found ${snapshot.size} reservations in Firebase`);
        } catch (error) {
            console.error('Error loading reservations:', error);
        }
    }

    createReservationRow(id, reservation) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${id.substring(0, 8)}</td>
            <td>${reservation.customerName || 'No name'}</td>
            <td>${reservation.contactNumber || 'No contact'}</td>
            <td>${reservation.carModel || 'No car'}</td>
            <td>${reservation.startDate || 'No date'}</td>
            <td>${reservation.endDate || 'No date'}</td>
            <td>${reservation.status || 'Unknown'}</td>
            <td><button class="btn btn-gray removeReservation" data-id="${id}">Remove</button></td>
        `;

        return row;
    }

    // ===== REMOVE RESERVATION FROM FIRESTORE =====
    async removeReservation(id) {
        if (!confirm('Are you sure you want to remove this reservation?')) {
            return;
        }

        try {
            const db = firebase.firestore();
            await db.collection('reservations').doc(id).delete();
            await this.loadReservations();
            alert('Reservation removed successfully!');
        } catch (error) {
            console.error('Error removing reservation:', error);
            alert('Error removing reservation: ' + error.message);
        }
    }
}

// ===== Initialize Admin When DOM Loads =====
document.addEventListener('DOMContentLoaded', () => {
    window.carRentalAdmin = new CarRentalAdmin();
});