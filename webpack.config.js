const path = require("path");
const webpack = require("webpack");

module.exports = {
    mode: "development",
    devtool: "source-map",
    entry: "./src/main.ts",
    resolve: {
        extensions: [".ts", ".js"]
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                include: path.resolve(__dirname, "src"),
                loader: "ts-loader"
            },
            {
                test: /\.(css|scss)$/,
                use: ["style-loader", "css-loader", "sass-loader"]
            },
            {
                test: /\.(png|jpe?g|gif)$/i,
                loader: "file-loader",
                options: {
                    outputPath: "images",
                    publicPath: "js/images"
                }
            }
        ]
    },
    output: {
        path: path.resolve(__dirname, "public/js"),
        publicPath: "/public/js/",
        filename: "main.js"
    },
    devServer: {
        contentBase: path.join(__dirname, "public/"),
        port: 3000,
        publicPath: "http://localhost:3000/public/",
        hotOnly: true
    },
    plugins: [new webpack.HotModuleReplacementPlugin()]
};