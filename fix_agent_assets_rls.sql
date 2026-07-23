-- Permite que o Agente IoT (que usa a chave anon) possa atualizar as especificações e o histórico do Ativo
CREATE POLICY "Allow anon update on assets for IoT Agent" 
    ON public.assets 
    FOR UPDATE 
    TO anon
    USING (true);
