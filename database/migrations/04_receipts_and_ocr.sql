-- =============================================================================
-- Migration 04: Receipts and OCR Processing
-- Solo Accountant AI SaaS - Receipt Management and OCR Processing
-- =============================================================================

-- Receipt storage and metadata
CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id),
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    status receipt_status DEFAULT 'uploaded',
    uploaded_by UUID NOT NULL REFERENCES users(id),
    ocr_text TEXT,
    ocr_confidence DECIMAL(5,4),
    extracted_data JSONB,
    processing_error TEXT,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OCR extraction results
CREATE TABLE receipt_extractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    vendor_name VARCHAR(255),
    transaction_date DATE,
    total_amount DECIMAL(15,2),
    tax_amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    line_items JSONB,
    confidence_scores JSONB,
    extracted_fields JSONB,
    processing_time_ms INTEGER,
    ocr_provider VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_receipts_client_id ON receipts(client_id);
CREATE INDEX idx_receipts_transaction_id ON receipts(transaction_id);
CREATE INDEX idx_receipts_status ON receipts(status);
CREATE INDEX idx_receipts_uploaded_by ON receipts(uploaded_by);
CREATE INDEX idx_receipts_created_at ON receipts(created_at);
CREATE INDEX idx_receipts_file_name ON receipts(file_name);

CREATE INDEX idx_receipt_extractions_receipt_id ON receipt_extractions(receipt_id);
CREATE INDEX idx_receipt_extractions_vendor ON receipt_extractions(vendor_name);
CREATE INDEX idx_receipt_extractions_date ON receipt_extractions(transaction_date);
CREATE INDEX idx_receipt_extractions_amount ON receipt_extractions(total_amount);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_receipts_updated_at 
    BEFORE UPDATE ON receipts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();