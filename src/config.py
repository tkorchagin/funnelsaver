import yaml, os

class Config:
    def __init__(self, path: str = None):
        self.path = path or os.getenv('FUNNEL_CONFIG', '.funnelsaver.yml')
        self.data = {}
        self.load()

    def load(self):
        if os.path.exists(self.path):
            with open(self.path, 'r') as f:
                self.data = yaml.safe_load(f) or {}
        else:
            # Use defaults if config file doesn't exist
            self.data = {}

    def get(self, key, default=None):
        return self.data.get(key, default)

    # Helper properties for common settings
    @property
    def viewport(self):
        return self.data.get('viewport', {'width': 430, 'height': 932})

    @property
    def user_agent(self):
        return self.data.get('user_agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')

    @property
    def max_steps(self):
        return int(self.data.get('max_steps', 20))

    @property
    def default_form_values(self):
        return self.data.get('default_form_values', {})
