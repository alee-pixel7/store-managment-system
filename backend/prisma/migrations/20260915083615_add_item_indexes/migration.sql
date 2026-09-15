-- CreateIndex
CREATE INDEX "item_aliases_alias_name_idx" ON "item_aliases"("alias_name");

-- CreateIndex
CREATE INDEX "item_aliases_item_id_idx" ON "item_aliases"("item_id");

-- CreateIndex
CREATE INDEX "items_is_active_idx" ON "items"("is_active");

-- CreateIndex
CREATE INDEX "items_category_id_idx" ON "items"("category_id");

-- CreateIndex
CREATE INDEX "items_item_name_idx" ON "items"("item_name");

-- CreateIndex
CREATE INDEX "items_brand_idx" ON "items"("brand");
