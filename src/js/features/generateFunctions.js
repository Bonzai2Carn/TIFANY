function generateTabs(tableHtml) {
    // Get the number of tabs to generate
    const buttonIndex = parseInt($('#buttonIndex').val());

    // Validate input
    if (isNaN(buttonIndex) || buttonIndex < 1 || buttonIndex > 100) {
        alert('Please enter a valid number between 1 and 100');
        return;
    }

    //existing textarea content
    // const existingContent = $('#tableInput').val();
    // Create tabs container if it doesn't exist
    if ($('#tableContainer .panel').length === 0) {
        $('#tableContainer').prepend('<button class="accordion"><b>Unit Size</b></button>' + '<div class="panel">');
    }

    // Generate the tabs HTML
    let tabsHtml = '<div class="sp-selector">\n';
    for (let i = 1; i <= buttonIndex; i++) {
        tabsHtml += `<button class="sp-option" data-value="${i}" data-panel="0">${i}</button>\n`;
    }

    tabsHtml += '</div><br>';

    // Combine tabs HTML with table HTML
    const panelHtml = tabsHtml + tableHtml;

    // Add tabs to the tabs container
    $('#tableContainer .panel').html(panelHtml);

    // Add a newline after generated tabs if existing content exists
    // const finalContent = existingContent
    //     ? `${tabsHtml}\n${existingContent}`
    //     : tabsHtml;
    // // Set the generated HTML in the textarea
    // $('#tableInput').val(finalContent);

    initializeAllFeatures();
    setupTableInteraction();
    console.log(`Generated ${buttonIndex} tabs`);
    $.toast(`Generated ${buttonIndex} tabs`)
}

function generateCode() {
    // if (!currentTable) {
    //     alert('No table to generate code from');
    //     return;
    // }

    console.group('Generate Code Process');
    console.log('Current Table Status:', !!currentTable);
    $.toast({
                    // heading: 'Success',
                    text: `Current Table Status: ${!!currentTable}`,
                    showHideTransition: 'slide',
                    loader: false,
                    stack: 'false'
                })
    try {
        // Reset the table container before cloning
        // $('#tableContainer').empty().append(currentTable.clone());

        const $table = $('#tableContainer').clone();

        // Remove interaction classes (condition)
        if (crosshairEnabled) {
            $table.addClass('crosshair-table');
            initCrosshair();
        } else {
            $table.removeClass('crosshair-table');
            $table.find('.highlight-row, .highlight-col').removeClass('highlight-row highlight-col');
        }

        // Add test ID and remove style
        $table.find('tr').attr('id', 'test');
        //remove style
        $table.removeAttr('style');
        $table.find('td', 'th', 'tr').removeClass('selected-cell');
        $table.find('.text-center.p-5:has(p:contains("Table View"))').remove();
        $table.find('td').removeAttr('style');

        // Generate clean HTML
        const tableHtml = $('<div>').append($table).html();

        // Format the HTML
        const formattedHtml = formatHtml(tableHtml);

        $('#tableOutput').text(formattedHtml);

        initializeAllFeatures();
        setupTableInteraction();
        console.log('HTML Generation Successful');
        console.log('Generated HTML Length:', formattedHtml.length);
    } catch (error) {
        console.error('Error in code generation:', error);
        alert('Failed to generate code. Check console for details.');
    } finally {
        console.groupEnd();
    }
}

function copyInput() {
        const formatBoard = $('#tableOutput').val();
        if (!formatBoard || formatBoard.trim() === '') {
            // More descriptive error message
            alert('The text area is empty. Please add content before copying.');
            return;
        }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(formatBoard)
                .then(() => {
                    alert('HTML copied to clipboard!');
                })
        } else {
            alert('Failed to coppy')
        }
    }