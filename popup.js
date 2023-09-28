let isVisible = true;

document.getElementById('popupContent').addEventListener('click', function() {
    if (isVisible) {
        this.style.display = 'none';
    } else {
        this.style.display = 'block';
    }
    isVisible = !isVisible;
});
