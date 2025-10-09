"""
Sample test file to verify pytest infrastructure works
Run with: pytest tests/test_sample.py -v
"""

import pytest


class TestPytestSetup:
    """Verify pytest configuration works"""

    def test_basic_assertion(self):
        """Test basic assertion"""
        assert True

    def test_fixture_loading(self, mock_supabase):
        """Test that fixtures load correctly"""
        assert mock_supabase is not None
        assert hasattr(mock_supabase, 'table')

    @pytest.mark.async
    async def test_async_support(self):
        """Test async test support"""
        result = await self._async_operation()
        assert result == "success"

    async def _async_operation(self):
        """Helper async function"""
        return "success"

    def test_environment_vars(self, monkeypatch):
        """Test environment variable mocking"""
        import os
        assert os.getenv("ENVIRONMENT") == "test"
        assert os.getenv("SUPABASE_URL") == "https://test.supabase.co"

    @pytest.mark.unit
    def test_marker_unit(self):
        """Test unit marker works"""
        assert 1 + 1 == 2

    @pytest.mark.integration
    def test_marker_integration(self, mock_supabase):
        """Test integration marker works"""
        # Simulate database operation
        mock_supabase.table("test").select("*").execute()
        assert True


# Run a quick smoke test
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
