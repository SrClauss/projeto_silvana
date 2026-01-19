import { Box, Typography } from "@mui/material";

interface TitleProps {
  text: string;
  subtitle?: string;
}
/**
 * Um componente de título moderno com o texto centralizado
 * e linhas decorativas em gradiente nas duas laterais.
 */
const Title = ({ text, subtitle }: TitleProps) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        my: 4, // Margem vertical para separar as seções
      }}
    >
      {/* Linha da Esquerda (Gradiente da esquerda para direita) */}
      <Box
        sx={{
          flexGrow: 1,
          height: "2px",
          background: (theme) => 
            `linear-gradient(to right, transparent, ${theme.palette.primary.light})`,
          borderRadius: "2px",
          opacity: 0.6,
        }}
      />

      {/* Container do Texto Centralizado */}
      <Box sx={{ px: 3, textAlign: "center" }}>
        <Typography
          variant="h5"
          component="h2"
          sx={{
            fontWeight: 800,
            color: "text.primary",
            whiteSpace: "nowrap",
            lineHeight: 1.2,
          }}
        >
          {text}
        </Typography>
        <Typography
          variant="overline"
          component="span"
          sx={{
            display: "block",
            fontWeight: 700,
            letterSpacing: "0.2rem",
            color: "text.secondary",
            textTransform: "uppercase",
            fontSize: "0.7rem",
            lineHeight: 1,
            mt: 0.5
          }}
        >
            {subtitle}
        </Typography>
      </Box>

      {/* Linha da Direita (Gradiente da direita para esquerda) */}
      <Box
        sx={{
          flexGrow: 1,
          height: "2px",
          background: (theme) => 
            `linear-gradient(to left, transparent, ${theme.palette.primary.light})`,
          borderRadius: "2px",
          opacity: 0.6,
        }}
      />
    </Box>
  );
};
export default Title;