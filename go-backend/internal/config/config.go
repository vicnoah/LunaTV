package config

import (
	"fmt"
	"github.com/spf13/viper"
)

// Config holds all configuration for the application.
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
}

// ServerConfig holds the server configuration.
type ServerConfig struct {
	Port string `mapstructure:"port"`
}

// DatabaseConfig holds the database connection configuration.
type DatabaseConfig struct {
	Type             string `mapstructure:"type"`
	ConnectionString string `mapstructure:"connection_string"`
}

// JWTConfig holds the JWT authentication configuration.
type JWTConfig struct {
	Secret        string `mapstructure:"secret"`
	TokenLifespan string `mapstructure:"token_lifespan"`
}

// LoadConfig reads configuration from file or environment variables.
func LoadConfig() (config Config, err error) {
	// Set the file name of the configurations file
	viper.SetConfigName("config")
	// Set the type of the configuration file
	viper.SetConfigType("toml")
	// Set the path to look for the configurations file
	viper.AddConfigPath(".")
	// Search config in the current directory

	// Enable VIPER to read Environment Variables
	viper.AutomaticEnv()

	if err = viper.ReadInConfig(); err != nil {
		return Config{}, fmt.Errorf("error reading config file: %w", err)
	}

	err = viper.Unmarshal(&config)
	if err != nil {
		return Config{}, fmt.Errorf("unable to decode into struct: %w", err)
	}

	return
}
