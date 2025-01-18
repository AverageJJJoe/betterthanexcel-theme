<?php
/**
 * GeneratePress child theme functions and definitions.
 */

// Enqueue parent theme styles
add_action('wp_enqueue_scripts', 'generatepress_child_enqueue_styles');
function generatepress_child_enqueue_styles() {
    wp_enqueue_style('generatepress-style', get_template_directory_uri() . '/style.css');
    wp_enqueue_style('generatepress-child-style', get_stylesheet_uri());
}

// Initialize invoice counter
function init_invoice_counter() {
    if (get_option('total_invoices_generated') === false) {
        add_option('total_invoices_generated', 0);
    }
}
add_action('init', 'init_invoice_counter');

// Add this function to handle mobile AJAX requests properly
function handle_mobile_headers() {
    if (is_page('invoice-generator')) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
        header('Access-Control-Allow-Credentials: true');
    }
}
add_action('init', 'handle_mobile_headers');

// AJAX handler to increment counter with mobile support
function increment_invoice_counter() {
    check_ajax_referer('invoice_nonce', 'nonce');
    
    // Add error logging
    error_log('Increment invoice counter called');
    
    $current_count = get_option('total_invoices_generated', 0);
    $new_count = $current_count + 1;
    
    if (update_option('total_invoices_generated', $new_count)) {
        wp_send_json_success(array(
            'count' => $new_count,
            'message' => 'Counter updated successfully',
            'timestamp' => time()
        ));
    } else {
        wp_send_json_error(array(
            'message' => 'Failed to update counter'
        ));
    }
}
add_action('wp_ajax_increment_invoice_counter', 'increment_invoice_counter');
add_action('wp_ajax_nopriv_increment_invoice_counter', 'increment_invoice_counter');

// Invoice Generator Scripts and Styles
function invoice_generator_scripts() {
    if (is_front_page() || is_page('invoice-generator')) {
        // Add jsPDF library with specific version
        wp_enqueue_script('jspdf', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', array(), null, true);
        wp_enqueue_script('jspdf-autotable', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js', array('jspdf'), null, true);
        
        // Vue.js - Production build
        wp_enqueue_script('vue-js', 'https://unpkg.com/vue@3/dist/vue.global.prod.js', array(), null, true);
        
        // Your invoice script
        wp_enqueue_script('invoice-script', get_stylesheet_directory_uri() . '/invoice-app/script.js', array('vue-js', 'jspdf', 'jspdf-autotable'), '1.0.' . time(), true);
        
        // Add the invoice data
        wp_localize_script('invoice-script', 'invoiceData', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('invoice_nonce'),
            'currentCount' => get_option('total_invoices_generated', 0)
        ));
        
        // Add console logging for debugging
        wp_add_inline_script('invoice-script', '
            console.log("jsPDF loaded:", typeof window.jspdf);
            console.log("Vue loaded:", typeof Vue);
            console.log("Scripts initialized");
            console.log("Invoice Data:", invoiceData);
        ');
    }
}
add_action('wp_enqueue_scripts', 'invoice_generator_scripts');