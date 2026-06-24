// @todo: напишите здесь код парсера

function parsePage() {
    function parseOpenGraph() {
        const og = {};
        document.querySelectorAll('meta[property^="og:"]').forEach(meta => {
            const property = meta.getAttribute('property');
            let content = meta.getAttribute('content');
            if (property && content) {
                const key = property.replace(/^og:/, '');
                // Для title обрезаем по " —"
                if (key === 'title') {
                    content = content.split(' —')[0];
                }
                if (og.hasOwnProperty(key)) {
                    if (!Array.isArray(og[key])) og[key] = [og[key]];
                    og[key].push(content);
                } else {
                    og[key] = content;
                }
            }
        });
        return og;
    }

    function parseReviews() {
        const articles = document.querySelectorAll('.reviews .items article');
        return Array.from(articles).map(article => {
            // Количество заполненных звёзд
            const ratingSpans = article.querySelectorAll('.rating span');
            const filled = Array.from(ratingSpans).filter(s => s.classList.contains('filled')).length;

            const title = article.querySelector('.title')?.textContent?.trim() || '';
            const description = article.querySelector('p')?.textContent?.trim() || '';
            const authorEl = article.querySelector('.author');
            const avatar = authorEl?.querySelector('img')?.getAttribute('src') || '';
            const authorName = authorEl?.querySelector('span')?.textContent?.trim() || '';
            
            // Дата: парсим и форматируем в DD.MM.YYYY
            const dateStr = authorEl?.querySelector('i')?.textContent?.trim() || '';
            let formattedDate = '';
            if (dateStr) {
                const parts = dateStr.split(/[\/.]/); // разделитель / или .
                if (parts.length === 3) {
                    const day = parts[0].padStart(2, '0');
                    const month = parts[1].padStart(2, '0');
                    const year = parts[2];
                    formattedDate = `${day}.${month}.${year}`;
                } else {
                    formattedDate = dateStr; // fallback
                }
            }

            return {
                rating: filled,
                author: {
                    avatar: avatar,
                    name: authorName
                },
                title: title,
                description: description,
                date: formattedDate
            };
        });
    }


    function parseTags() {
        const container = document.querySelector('.tags');
        // Если блока с тегами нет – возвращаем пустые массивы
        if (!container) {
            return { category: [], label: [], discount: [] };
        }

        const result = { category: [], label: [], discount: [] };

        // Выбираем все span внутри .tags
        container.querySelectorAll('span').forEach(span => {
            const text = span.textContent.trim();
            // Определяем тип по классу
            if (span.classList.contains('green')) {
            result.category.push(text);
            } else if (span.classList.contains('blue')) {
            result.label.push(text);
            } else if (span.classList.contains('red')) {
            result.discount.push(text);
            }
        });

        return result;
    }

    function parseProperties() {
        const items = document.querySelectorAll('.properties li');
        const result = {};
        items.forEach(li => {
            const spans = li.querySelectorAll('span');
            if (spans.length === 2) {
                const key = spans[0].textContent.trim();
                const value = spans[1].textContent.trim();
                if (key) result[key] = value;
            }
        });
        return result;
    }

    function parseDescription() {
        const descEl = document.querySelector('.description');
        if (!descEl) return '';
        let html = descEl.innerHTML.trim();
        // Удаляем класс "unused" у тега <h3>
        html = html.replace(/<h3\s+class="unused">/g, '<h3>');
        return html;
    }

    function extractPriceNumber(priceText){
        if (!priceText) return 0;
        // Удаляем первый символ (валюту) и обрезаем пробелы
        const numericStr = priceText.slice(1).trim();
        return parseInt(numericStr, 10) || 0;
    }

    function extractPriceString(priceText) {
        if (!priceText) return '0';
        const numericStr = priceText.slice(1).trim();
        return numericStr;
    }

    function extractCurrency(priceText) {
        const symbol = priceText.slice(0, 1);
        if (symbol === '₽'){
            return 'RUB';
        } else if (symbol === '€') {
            return 'EUR';
        }
        return 'USD';
    }

    const priceEl = document.querySelector('.price');
    const priceText = priceEl.childNodes[0].textContent.trim();
    const oldPriceText = priceEl.querySelector('span').textContent.trim();
    const currentPriceNum = extractPriceNumber(priceText);
    const oldPriceNum = extractPriceNumber(oldPriceText);
    const discountDelta = oldPriceNum - currentPriceNum;
    const discountPercent = oldPriceNum > 0 ? ((oldPriceNum - currentPriceNum) / oldPriceNum * 100).toFixed(2) + '%' : '0.00%';
    const currency = extractCurrency(priceText);

    return {
        meta: {
            language: document.querySelector('html').getAttribute('lang'),
            title: document.querySelector('head title').textContent.split(' —')[0],
            keywords: document.querySelector('meta[name="keywords"]').getAttribute('content').split(', '),
            description: document.querySelector('meta[name="description"]').getAttribute('content'),
            opengraph: parseOpenGraph(),
        },
        product: {
            id: document.querySelector('.product').dataset.id,
            images: Array.from(document.querySelectorAll('.preview > nav > button > img')).map(item => ({
                preview: item.getAttribute('src'),
                full: item.dataset.src,
                alt: item.getAttribute('alt'),
            })),
            isLiked: document.querySelector('.preview figure .like')?.classList.contains('active') ?? false,
            name: document.querySelector('h1').textContent.trim(),
            tags: parseTags(),
            price: currentPriceNum,
            oldPrice: oldPriceNum,
            discount: discountDelta,
            discountPercent: discountPercent,
            currency: currency,
            properties: parseProperties(),
            description: parseDescription(),
        },
        suggested: Array.from(document.querySelectorAll('.suggested article')).map(item => ({
            name: item.querySelector('h3').textContent.trim(),
            description: item.querySelector('p').textContent.trim(),
            image: item.querySelector('img').src,
            price: extractPriceString(item.querySelector('b').textContent.trim()),
            currency: extractCurrency(item.querySelector('b').textContent.trim())
        })),
        reviews: parseReviews()
    };
}

window.parsePage = parsePage;