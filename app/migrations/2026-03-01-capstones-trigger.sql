CREATE TRIGGER update_capstones_updated_at
  BEFORE UPDATE ON capstones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
