document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const barcodeInput = document.getElementById('barcode-input');
    const formFeedback = document.getElementById('form-feedback');
    const resultsSection = document.getElementById('product-results');
    const productNameEl = document.getElementById('product-name');
    const productImageEl = document.getElementById('product-image');
    const productIngredientsEl = document.getElementById('product-ingredients');
    const productAllergensEl = document.getElementById('product-allergens');

    function showFeedback(message, type = 'danger') {
        formFeedback.innerHTML = `<div class="alert alert-${type} fade-in" role="alert">${message}</div>`;
    }
    function clearFeedback() {
        formFeedback.innerHTML = '';
    }

    async function fetchProductData(barcode) {
        const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?lc=pt`;
        try {
            const response = await fetch(url);
            if (response.status === 404) {
                throw new Error(`404`);
            }
            if (!response.ok) {
                throw new Error(`status:${response.status}`);
            }
            const data = await response.json();
            if (!data.product) {
                throw new Error(`nao-encontrado`);
            }
            return data.product;
        } catch (error) {
            console.error("Erro detalhado:", error);
            if (error.message === "404" || error.message === "nao-encontrado") {
                showFeedback("Produto não encontrado. Tente outro código de barras.", "warning");
            } else {
                showFeedback("Não foi possível buscar os dados no momento. Tente novamente.", "danger");
            }
            return null;
        }
    }

    const allergenTranslations = {
        "milk": "Leite",
        "nuts": "Nozes / Castanhas",
        "soybeans": "Soja",
        "eggs": "Ovos",
        "wheat": "Trigo",
        "peanuts": "Amendoim",
        "crustaceans": "Frutos do Mar (crustáceos)",
        "fish": "Peixe",
        "gluten": "Glúten",
        "sesame-seeds": "Gergelim",
        "celery": "Aipo",
        "mustard": "Mostarda",
        "lupin": "Tremoço",
        "molluscs": "Moluscos",
        "sulphur-dioxide-and-sulphites": "Sulfitos"
    };

    function displayProductData(product) {
        resultsSection.style.opacity = '0';
        resultsSection.classList.remove('d-none');
        productNameEl.textContent = product.product_name_pt || product.product_name || 'Nome não disponível';
        productImageEl.src = product.image_front_url || 'https://via.placeholder.com/200x200.png?text=Sem+Imagem';
        productIngredientsEl.textContent = product.ingredients_text_pt || product.ingredients_text || 'Lista de ingredientes não disponível.';
        productAllergensEl.innerHTML = '';
        const tags = product.allergens_tags || [];
        const hierarchy = product.allergens_hierarchy || [];
        const allergensString = product.allergens || '';
        const fromString = allergensString ? allergensString.split(',').map(s => s.trim()) : [];
        const combinedAllergens = [...new Set([...tags, ...hierarchy, ...fromString])].filter(Boolean);
        if (combinedAllergens.length > 0) {
            combinedAllergens.forEach((allergen, index) => {
                let formatted = allergen.replace('en:', '').replace(/-/g, ' ').toLowerCase();
                let translated = allergenTranslations[formatted] || formatted.charAt(0).toUpperCase() + formatted.slice(1);
                const allergenBadge = document.createElement('span');
                allergenBadge.className = 'allergen-badge';
                allergenBadge.textContent = translated;
                productAllergensEl.appendChild(allergenBadge);
            });
        } else {
            productAllergensEl.innerHTML = '<span class="allergen-badge allergen-badge--success">Nenhum alérgeno comum declarado</span>';
        }
        setTimeout(() => {
            resultsSection.style.opacity = '1';
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    searchForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearFeedback();
        resultsSection.classList.add('d-none');
        const barcode = barcodeInput.value.trim();
        if (!barcode) {
            showFeedback('Por favor, insira um código de barras.');
            return;
        }
        showFeedback('Buscando produto...', 'warning');

        const product = await fetchProductData(barcode);

        if (product) {
            clearFeedback();
            displayProductData(product);
        }
    });

    const chartCanvas = document.getElementById('allergies-prevalence-chart');
    if (chartCanvas) {
        new Chart(chartCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Leite', 'Ovos', 'Amendoim', 'Soja', 'Trigo', 'Frutos do Mar', 'Nozes/Castanhas', 'Peixe'],
                datasets: [{
                    label: 'Prevalência Estimada (%)',
                    data: [2.5, 1.3, 1.2, 0.4, 0.4, 1.0, 0.6, 0.4],
                    backgroundColor: [
                        'rgba(46, 175, 125, 0.8)',
                        'rgba(243, 122, 35, 0.8)',
                        'rgba(229, 58, 64, 0.7)',
                        'rgba(142, 68, 173, 0.7)',
                        'rgba(77, 196, 161, 0.8)',
                        'rgba(255, 154, 79, 0.8)',
                        'rgba(237, 120, 124, 0.7)',
                        'rgba(171, 119, 193, 0.7)',
                    ],
                    borderColor: '#FDFBFA',
                    borderWidth: 4,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, 
                cutout: '60%', 
                plugins: {
                    legend: {
                        display: false 
                    },
                    tooltip: {
                        enabled: false 
                    }
                },
                onHover: (event, chartElements, chart) => {
                    if (chartElements.length) {
                        const element = chartElements[0];
                        const index = element.index;
                        const label = chart.data.labels[index];

                        const oldText = document.querySelector('.chart-center-text');
                        if (oldText) oldText.remove();

                        const text = document.createElement('div');
                        text.className = 'chart-center-text';
                        text.textContent = label;
                        
                        const canvas = chart.canvas;
                        const parent = canvas.parentElement;

                        text.style.position = 'absolute';
                        text.style.top = `${canvas.offsetTop + (canvas.offsetHeight / 2)}px`;
                        text.style.left = `${canvas.offsetLeft + (canvas.offsetWidth / 2)}px`;
                        text.style.transform = 'translate(-50%, -50%)';
                        text.style.fontSize = '1.5rem';
                        text.style.fontWeight = 'bold';
                        text.style.color = '#333';
                        text.style.pointerEvents = 'none';

                        parent.appendChild(text);
                    } else {
                        const oldText = document.querySelector('.chart-center-text');
                        if (oldText) oldText.remove();
                    }
                },
                animation: {
                    animateScale: true,
                    animateRotate: true,
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    const reportForm = document.getElementById('reaction-report-form');
    if (reportForm) {
        reportForm.addEventListener('submit', (event) => {
            event.preventDefault();
            alert('Obrigado! Seu relato foi enviado para análise.');
            reportForm.reset();
        });
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1
    });

    const sectionsToAnimate = document.querySelectorAll('#prevalence-chart, #report-form, .asbai-section');
    sectionsToAnimate.forEach(section => {
        section.classList.add('fade-in-section');
        observer.observe(section);
    });
});