// ===================================================================================
    // 2. RE-USABLE INITIALIZATION FUNCTIONS
    // ===================================================================================
    /**
     * Finds all accordion headers and makes them clickable to toggle sibling rows.
     */
    function initAccordions() {
        $('body').off('click.accordion').on('click.accordion', '.accordion-header', function () {
            $(this).toggleClass('actives');
            $(this).closest('tr').nextUntil('.accordion-header').toggle();
        });
    }

    /**
     * Wires up the crosshair highlighting feature for any table with the .crosshair-table class.
     */
    //==============================================================================================
    // 2.5 The Header Accordion
    //===============================================================================================
    function headerAccordion() {
        $('.accordion').off('click.accordion').on('click.accordion', function () {
            $(this).toggleClass('active');
            const $panel = $(this).next('.panel');
            $panel.slideToggle(200); // toggles between display block/none
        });
    }


    /**
     * Wires up the column-hiding functionality based on the .sp-option selectors.
     */
    function initSpSelectors() {
        $('body').off('click.sp_selector').on('click.sp_selector', '.sp-option', function () {
            const $option = $(this);
            const panel = $option.closest('.panel');
            const table = panel.find('.tablecoil');
            const spValue = $option.data('value');

            panel.find('.sp-option').removeClass('active');
            $option.addClass('active');

            table.find('[class*="sp-"]').removeClass('active');
            table.find(`.sp-${spValue}`).addClass('active');
        });
    }
